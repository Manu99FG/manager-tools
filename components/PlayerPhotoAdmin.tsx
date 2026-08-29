"use client";

import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
} from "react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Props = {
  playerId: string;
  playerName: string;
  currentPhotoUrl?:
    | string
    | null;
};

type ApiResult = {
  ok?: boolean;
  photoUrl?:
    | string
    | null;
  error?: string;
};

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

const OUTPUT_WIDTH = 900;
const OUTPUT_HEIGHT = 1100;
function cleanPlayerName(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canvasToBlob(
  canvas: HTMLCanvasElement
) {
  return new Promise<Blob>(
    (
      resolve,
      reject
    ) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "No se pudo generar el PNG final."
              )
            );

            return;
          }

          resolve(blob);
        },
        "image/png"
      );
    }
  );
}

async function loadBlobImage(
  blob: Blob
) {
  const url =
    URL.createObjectURL(
      blob
    );

  try {
    const image =
      new Image();

    image.decoding =
      "async";

    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        image.onload = () =>
          resolve();

        image.onerror = () =>
          reject(
            new Error(
              "No se pudo leer la imagen procesada."
            )
          );

        image.src = url;
      }
    );

    return image;
  } finally {
    URL.revokeObjectURL(
      url
    );
  }
}


type AutoFrame = {
  zoom: number;
  horizontalOffset: number;
  verticalOffset: number;
};

async function getAutomaticFrameOnce(
  blob: Blob
): Promise<AutoFrame> {
  const image =
    await loadBlobImage(
      blob
    );

  /*
   * AUTOENCUADRE UNA SOLA VEZ.
   *
   * Se analiza únicamente una miniatura de 220 px.
   * No hay bucles, no hay análisis al guardar y no hay
   * análisis al renderizar la ficha del jugador.
   */
  const MAX_SIDE = 220;

  const analysisScale =
    Math.min(
      1,
      MAX_SIDE /
        Math.max(
          image.naturalWidth,
          image.naturalHeight
        )
    );

  const width =
    Math.max(
      1,
      Math.round(
        image.naturalWidth *
          analysisScale
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        image.naturalHeight *
          analysisScale
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
    );

  if (!context) {
    return {
      zoom: 100,
      horizontalOffset: 0,
      verticalOffset: 0,
    };
  }

  context.clearRect(
    0,
    0,
    width,
    height
  );

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  const pixels =
    context.getImageData(
      0,
      0,
      width,
      height
    ).data;

  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (
    let y = 0;
    y < height;
    y += 1
  ) {
    for (
      let x = 0;
      x < width;
      x += 1
    ) {
      const alpha =
        pixels[
          (y * width + x) *
            4 +
            3
        ];

      if (alpha <= 18) {
        continue;
      }

      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (
    right < left ||
    bottom < top
  ) {
    return {
      zoom: 100,
      horizontalOffset: 0,
      verticalOffset: 0,
    };
  }

  const subjectHeightSmall =
    bottom - top + 1;

  const subjectCenterXSmall =
    (left + right) / 2;

  /*
   * Convertimos únicamente los límites detectados
   * a coordenadas de la imagen original.
   */
  const subjectTop =
    top / analysisScale;

  const subjectHeight =
    subjectHeightSmall /
    analysisScale;

  const subjectCenterX =
    subjectCenterXSmall /
    analysisScale;

  /*
   * OBJETIVO:
   * - cabeza completa SIEMPRE;
   * - margen superior visible;
   * - hombros y pecho superior;
   * - sin necesidad de corrección manual.
   *
   * Tomamos aproximadamente el 58 % superior de la silueta.
   * Esto evita que una foto de cuerpo entero quede pequeña.
   */
  const visibleSubjectHeight =
    subjectHeight * 0.58;

  /*
   * Margen superior alineado visualmente con el inicio
   * del número de media de la ficha.
   *
   * En la tarjeta, el número grande comienza aproximadamente
   * al 15 % de la altura útil. Guardamos por tanto el PNG con
   * el primer píxel visible del cabello en ese mismo límite.
   *
   * Resultado:
   * - número y cabeza empiezan a la misma altura;
   * - composición más simétrica;
   * - sigue existiendo margen suficiente sobre el cabello;
   * - no hace falta ninguna corrección manual.
   */
  const TOP_MARGIN =
    OUTPUT_HEIGHT * 0.17;

  const availableHeight =
    OUTPUT_HEIGHT -
    TOP_MARGIN -
    OUTPUT_HEIGHT * 0.03;

  const desiredScaleByHeight =
    availableHeight /
    visibleSubjectHeight;

  /*
   * La ALTURA manda.
   *
   * Antes usábamos Math.min(altura, anchura). Eso funcionaba bien
   * con renders verticales, pero en fotos horizontales (por ejemplo
   * un portero con los brazos abiertos) la anchura limitaba demasiado
   * el zoom y dejaba una gran zona vacía debajo.
   *
   * Ahora priorizamos llenar la altura útil de la ficha. Si la imagen
   * es muy horizontal, permitimos que se recorten de forma simétrica
   * los extremos laterales (brazos/manos), manteniendo siempre
   * cabeza + hombros + torso principal dentro del encuadre.
   */
  /*
   * Seguridad de cabeza:
   *
   * La altura sigue mandando para evitar huecos grandes, pero
   * nunca permitimos que el zoom empuje la parte superior de la
   * silueta por encima del margen reservado para el cabello.
   */
  const desiredScale =
    desiredScaleByHeight;

  const containScale =
    Math.min(
      OUTPUT_WIDTH /
        image.naturalWidth,
      OUTPUT_HEIGHT /
        image.naturalHeight
    );

  /*
   * Zoom relativo al "contain" inicial.
   * Limitamos el máximo para evitar primeros planos exagerados.
   */
  /*
   * Calculamos el zoom objetivo y después aplicamos un límite de
   * seguridad específico para la cabeza.
   */
  const targetZoom =
    Math.max(
      90,
      Math.min(
        320,
        (
          desiredScale /
          containScale
        ) *
          100
      )
    );

  /*
   * Este límite garantiza que, incluso después de escalar y
   * reposicionar, el punto superior detectado de la silueta pueda
   * quedar dentro del lienzo con el margen superior reservado.
   */
  const maxScaleFromHead =
    (
      OUTPUT_HEIGHT -
      TOP_MARGIN
    ) /
    Math.max(
      1,
      image.naturalHeight -
      subjectTop
    );

  const maxZoomFromHead =
    (
      maxScaleFromHead /
      containScale
    ) *
    100;

  const zoom =
    Math.round(
      Math.max(
        90,
        Math.min(
          targetZoom,
          maxZoomFromHead,
          320
        )
      )
    );

  const finalScale =
    containScale *
    (zoom / 100);

  /*
   * Centrado horizontal por la propia silueta, no por el archivo PNG.
   */
  const imageCenterX =
    image.naturalWidth / 2;

  const shiftX =
    (
      imageCenterX -
      subjectCenterX
    ) *
    finalScale;

  const horizontalOffset =
    Math.round(
      Math.max(
        -35,
        Math.min(
          35,
          (
            shiftX /
            OUTPUT_WIDTH
          ) *
            100
        )
      )
    );

  /*
   * Posicionamos el primer píxel visible de la cabeza exactamente
   * bajo el margen superior. De este modo el pelo queda completo.
   */
  const scaledImageHeight =
    image.naturalHeight *
    finalScale;

  const baseDrawY =
    OUTPUT_HEIGHT -
    scaledImageHeight;

  const currentSubjectTop =
    baseDrawY +
    subjectTop *
      finalScale;

  const neededShiftY =
    TOP_MARGIN -
    currentSubjectTop;

  const verticalOffset =
    Math.round(
      Math.max(
        -45,
        Math.min(
          45,
          (
            neededShiftY /
            OUTPUT_HEIGHT
          ) *
            100
        )
      )
    );

  return {
    zoom,
    horizontalOffset,
    verticalOffset,
  };
}

async function createManualCrop({
  blob,
  zoom,
  horizontalOffset,
  verticalOffset,
}: {
  blob: Blob;
  zoom: number;
  horizontalOffset: number;
  verticalOffset: number;
}) {
  const image =
    await loadBlobImage(
      blob
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    OUTPUT_WIDTH;

  canvas.height =
    OUTPUT_HEIGHT;

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    throw new Error(
      "No se pudo crear el recorte final."
    );
  }

  context.clearRect(
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT
  );

  /*
   * Esta función NO analiza píxeles.
   * Solo dibuja la imagen usando el encuadre ya calculado.
   */
  const containScale =
    Math.min(
      OUTPUT_WIDTH /
        image.naturalWidth,
      OUTPUT_HEIGHT /
        image.naturalHeight
    );

  const manualScale =
    zoom / 100;

  const scale =
    containScale *
    manualScale;

  const drawWidth =
    image.naturalWidth *
    scale;

  const drawHeight =
    image.naturalHeight *
    scale;

  const horizontalPixels =
    (
      horizontalOffset /
      100
    ) *
    OUTPUT_WIDTH;

  const verticalPixels =
    (
      verticalOffset /
      100
    ) *
    OUTPUT_HEIGHT;

  /*
   * Centrado horizontal y anclado abajo.
   *
   * - horizontalOffset positivo -> derecha
   * - horizontalOffset negativo -> izquierda
   * - verticalOffset positivo   -> abajo
   * - verticalOffset negativo   -> arriba
   */
  const drawX =
    (
      OUTPUT_WIDTH -
      drawWidth
    ) / 2 +
    horizontalPixels;

  const drawY =
    OUTPUT_HEIGHT -
    drawHeight +
    verticalPixels;

  context.drawImage(
    image,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );

  return canvasToBlob(
    canvas
  );
}

export default function PlayerPhotoAdmin({
  playerId,
  playerName,
  currentPhotoUrl = null,
}: Props) {
  const router =
    useRouter();

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    originalPreviewUrl,
    setOriginalPreviewUrl,
  ] =
    useState<
      string | null
    >(null);

  /*
   * PNG completo sin fondo.
   * No se sube: sirve como fuente para el recorte.
   */
  const [
    removedBackgroundBlob,
    setRemovedBackgroundBlob,
  ] =
    useState<Blob | null>(
      null
    );

  const [
    removedBackgroundPreviewUrl,
    setRemovedBackgroundPreviewUrl,
  ] =
    useState<
      string | null
    >(null);

  /*
   * Este es el PNG normalizado que finalmente
   * se guarda en Supabase.
   */
  const [
    processedBlob,
    setProcessedBlob,
  ] =
    useState<Blob | null>(
      null
    );

  const [
    processedPreviewUrl,
    setProcessedPreviewUrl,
  ] =
    useState<
      string | null
    >(null);

  const [
    ,
    setZoom,
  ] =
    useState(100);

  const [
    ,
    setHorizontalOffset,
  ] =
    useState(0);

  const [
    ,
    setVerticalOffset,
  ] =
    useState(0);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    processing,
    setProcessing,
  ] =
    useState(false);

  const [
    cropping,
    setCropping,
  ] =
    useState(false);

  const [
    progress,
    setProgress,
  ] =
    useState(0);

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const replaceObjectUrl =
    useCallback(
      (
        blob: Blob,
        setter:
          Dispatch<
            SetStateAction<
              string | null
            >
          >
      ) => {
        const nextUrl =
          URL.createObjectURL(
            blob
          );

        setter(
          (currentUrl) => {
            if (
              currentUrl
            ) {
              URL.revokeObjectURL(
                currentUrl
              );
            }

            return nextUrl;
          }
        );
      },
      []
    );

  useEffect(() => {
    return () => {
      if (
        originalPreviewUrl
      ) {
        URL.revokeObjectURL(
          originalPreviewUrl
        );
      }

      if (
        removedBackgroundPreviewUrl
      ) {
        URL.revokeObjectURL(
          removedBackgroundPreviewUrl
        );
      }

      if (
        processedPreviewUrl
      ) {
        URL.revokeObjectURL(
          processedPreviewUrl
        );
      }
    };
  }, [
    originalPreviewUrl,
    removedBackgroundPreviewUrl,
    processedPreviewUrl,
  ]);

  const regenerateCrop =
    useCallback(
      async (
        sourceBlob: Blob,
        nextZoom: number,
        nextHorizontalOffset: number,
        nextVerticalOffset: number
      ) => {
        setCropping(true);

        try {
          const finalBlob =
            await Promise.race([
              createManualCrop({
                blob:
                  sourceBlob,
                zoom:
                  nextZoom,
                horizontalOffset:
                  nextHorizontalOffset,
                verticalOffset:
                  nextVerticalOffset,
              }),
              new Promise<never>(
                (
                  _resolve,
                  reject
                ) => {
                  window.setTimeout(
                    () => {
                      reject(
                        new Error(
                          "El recorte tardó demasiado. Prueba con otra imagen o vuelve a intentarlo."
                        )
                      );
                    },
                    12000
                  );
                }
              ),
            ]);

          setProcessedBlob(
            finalBlob
          );

          replaceObjectUrl(
            finalBlob,
            setProcessedPreviewUrl
          );
        } catch (
          cropError
        ) {
          console.error(
            "Error generando recorte:",
            cropError
          );

          setError(
            cropError instanceof
              Error
              ? cropError.message
              : "No se pudo generar el recorte final."
          );
        } finally {
          setCropping(
            false
          );
        }
      },
      [
        replaceObjectUrl,
      ]
    );

  /*
   * El análisis automático ya terminó antes.
   * Aquí solo redibujamos con los valores elegidos.
   * No hay ninguna nueva lectura de píxeles.
   */

  function resetProcessed() {
    setRemovedBackgroundBlob(
      null
    );

    setProcessedBlob(
      null
    );

    setZoom(100);
    setHorizontalOffset(0);
    setVerticalOffset(0);
    setProgress(0);

    if (
      removedBackgroundPreviewUrl
    ) {
      URL.revokeObjectURL(
        removedBackgroundPreviewUrl
      );
    }

    if (
      processedPreviewUrl
    ) {
      URL.revokeObjectURL(
        processedPreviewUrl
      );
    }

    setRemovedBackgroundPreviewUrl(
      null
    );

    setProcessedPreviewUrl(
      null
    );
  }

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    setMessage(null);
    setError(null);

    resetProcessed();

    const selected =
      event.target
        .files?.[0] ??
      null;

    if (!selected) {
      setFile(null);

      if (
        originalPreviewUrl
      ) {
        URL.revokeObjectURL(
          originalPreviewUrl
        );
      }

      setOriginalPreviewUrl(
        null
      );

      return;
    }

    if (
      !ALLOWED_TYPES.has(
        selected.type
      )
    ) {
      setError(
        "Solo se permiten archivos JPG, PNG o WEBP."
      );

      event.target.value =
        "";

      return;
    }

    if (
      selected.size >
      MAX_FILE_SIZE
    ) {
      setError(
        "La imagen no puede superar los 20 MB."
      );

      event.target.value =
        "";

      return;
    }

    if (
      originalPreviewUrl
    ) {
      URL.revokeObjectURL(
        originalPreviewUrl
      );
    }

    setFile(
      selected
    );

    setOriginalPreviewUrl(
      URL.createObjectURL(
        selected
      )
    );
  }

  async function handleRemoveBackground() {
    setMessage(null);
    setError(null);

    if (!file) {
      setError(
        "Selecciona una imagen primero."
      );

      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const {
        removeBackground,
      } =
        await import(
          "@imgly/background-removal"
        );

      const blob =
        await removeBackground(
          file,
          {
            progress: (
              _key: string,
              current: number,
              total: number
            ) => {
              if (
                total > 0
              ) {
                setProgress(
                  Math.round(
                    (
                      current /
                      total
                    ) *
                      100
                  )
                );
              }
            },
          }
        );

      setRemovedBackgroundBlob(
        blob
      );

      replaceObjectUrl(
        blob,
        setRemovedBackgroundPreviewUrl
      );

      /*
       * AUTOMÁTICO, PERO SOLO UNA VEZ:
       * analizamos una miniatura de 256 px para calcular
       * un encuadre inicial. Después no se vuelve a leer
       * ningún píxel al mover sliders, aplicar ajustes o guardar.
       */
      const automaticFrame =
        await getAutomaticFrameOnce(
          blob
        );

      setZoom(
        automaticFrame.zoom
      );

      setHorizontalOffset(
        automaticFrame.horizontalOffset
      );

      setVerticalOffset(
        automaticFrame.verticalOffset
      );

      const finalBlob =
        await createManualCrop({
          blob,
          zoom:
            automaticFrame.zoom,
          horizontalOffset:
            automaticFrame.horizontalOffset,
          verticalOffset:
            automaticFrame.verticalOffset,
        });

      setProcessedBlob(
        finalBlob
      );

      replaceObjectUrl(
        finalBlob,
        setProcessedPreviewUrl
      );

      setProgress(100);

      setMessage(
        "Fondo eliminado y encuadre automático generado. El análisis se hizo una sola vez; ya puedes guardar o ajustar manualmente."
      );
    } catch (
      processingError
    ) {
      console.error(
        "Error procesando la fotografía:",
        processingError
      );

      setError(
        processingError instanceof
          Error
          ? processingError.message
          : "No se pudo procesar la fotografía."
      );
    } finally {
      setProcessing(
        false
      );
    }
  }

  async function handleUpload(
    event: FormEvent
  ) {
    event.preventDefault();

    setMessage(null);
    setError(null);

    if (
      !processedBlob
    ) {
      setError(
        "Primero genera el recorte final."
      );

      return;
    }

    setBusy(true);

    try {
      const pngFile =
        new File(
          [
            processedBlob,
          ],
          `${playerId}.png`,
          {
            type:
              "image/png",
          }
        );

      const formData =
        new FormData();

      formData.append(
        "playerId",
        playerId
      );

      formData.append(
        "file",
        pngFile
      );

      const response =
        await fetch(
          "/api/player-photo/upload",
          {
            method:
              "POST",
            body:
              formData,
          }
        );

      const data =
        (await response.json()) as
          ApiResult;

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "No se pudo guardar la fotografía."
        );
      }

      setFile(null);

      if (
        originalPreviewUrl
      ) {
        URL.revokeObjectURL(
          originalPreviewUrl
        );
      }

      setOriginalPreviewUrl(
        null
      );

      resetProcessed();

      setMessage(
        "Fotografía guardada correctamente."
      );

      router.refresh();
    } catch (
      uploadError
    ) {
      console.error(
        "Error guardando la fotografía:",
        uploadError
      );

      setError(
        uploadError instanceof
          Error
          ? uploadError.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setMessage(null);
    setError(null);

    if (
      !window.confirm(
        "¿Eliminar la fotografía actual del jugador?"
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response =
        await fetch(
          "/api/player-photo/delete",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                playerId,
              }),
          }
        );

      const data =
        (await response.json()) as
          ApiResult;

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "No se pudo eliminar la fotografía."
        );
      }

      setMessage(
        "Fotografía eliminada."
      );

      router.refresh();
    } catch (
      deleteError
    ) {
      console.error(
        "Error eliminando la fotografía:",
        deleteError
      );

      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  const previewBox =
    "relative flex min-h-64 items-end justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900";

  const checkerBackground =
    "bg-[linear-gradient(45deg,#0f172a_25%,transparent_25%),linear-gradient(-45deg,#0f172a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#0f172a_75%),linear-gradient(-45deg,transparent_75%,#0f172a_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]";

  return (
    <section
      className="
        mt-6
        rounded-2xl
        border
        border-slate-800
        bg-slate-950/70
        p-4

        sm:p-5
      "
    >
      <div className="mb-4">
        <div
          className="
            text-xs
            font-bold
            uppercase
            tracking-[0.18em]
            text-blue-400
          "
        >
          Administración
        </div>

        <h2
          className="
            mt-1
            text-lg
            font-bold
            text-white
          "
        >
          Foto del jugador
        </h2>

        <p
          className="
            mt-1
            text-sm
            text-slate-400
          "
        >
          {cleanPlayerName(
            playerName
          )}
          . La web elimina el
          fondo y genera directamente
          un encuadre automático con
          margen seguro para cabeza
          y hombros.
        </p>
      </div>

      <div
        className="
          grid
          grid-cols-1
          gap-5

          md:grid-cols-2
          2xl:grid-cols-4
        "
      >
        <PreviewCard
          title="Foto actual"
          previewBox={
            previewBox
          }
        >
          {currentPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                currentPhotoUrl
              }
              alt={
                cleanPlayerName(
                  playerName
                )
              }
              className="
                max-h-72
                w-full
                object-contain
                object-bottom
              "
            />
          ) : (
            <Placeholder>
              Sin fotografía
            </Placeholder>
          )}
        </PreviewCard>

        <PreviewCard
          title="Original"
          previewBox={
            previewBox
          }
        >
          {originalPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                originalPreviewUrl
              }
              alt="Vista previa original"
              className="
                max-h-72
                w-full
                object-contain
              "
            />
          ) : (
            <Placeholder>
              Selecciona una imagen
            </Placeholder>
          )}
        </PreviewCard>

        <PreviewCard
          title="Sin fondo"
          previewBox={`${previewBox} ${checkerBackground}`}
        >
          {removedBackgroundPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                removedBackgroundPreviewUrl
              }
              alt="Vista previa sin fondo"
              className="
                max-h-72
                w-full
                object-contain
                object-bottom
              "
            />
          ) : (
            <Placeholder>
              PNG transparente completo
            </Placeholder>
          )}
        </PreviewCard>

        <PreviewCard
          title="Recorte automático"
          previewBox={`${previewBox} ${checkerBackground}`}
        >
          {processedPreviewUrl ? (
            <div
              className="
                flex
                h-72
                w-full
                items-end
                justify-center
                overflow-hidden
              "
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  processedPreviewUrl
                }
                alt="Recorte final"
                className="
                  h-full
                  w-auto
                  max-w-full
                  object-contain
                  object-bottom
                "
              />
            </div>
          ) : (
            <Placeholder>
              Aquí aparecerá el encuadre final
            </Placeholder>
          )}

          {cropping && (
            <div
              className="
                absolute
                inset-0
                flex
                items-center
                justify-center
                bg-slate-950/55
                text-xs
                font-bold
                text-white
                backdrop-blur-sm
              "
            >
              Generando vista previa…
            </div>
          )}
        </PreviewCard>
      </div>

      {removedBackgroundBlob && processedBlob && (
        <div
          className="
            mt-5
            rounded-2xl
            border
            border-emerald-800/60
            bg-emerald-950/20
            p-4
          "
        >
          <div
            className="
              text-sm
              font-bold
              text-emerald-300
            "
          >
            Encuadre automático listo
          </div>

          <p
            className="
              mt-1
              text-xs
              leading-5
              text-slate-400
            "
          >
            La silueta se analiza una sola vez sobre una miniatura
            muy pequeña. El cabello se coloca automáticamente en el
            mismo límite vertical donde comienza el número de media
            de la ficha, manteniendo también espacio para los hombros.
            No se vuelve a analizar la imagen al guardar.
          </p>
        </div>
      )}

      <form
        onSubmit={
          handleUpload
        }
        className="
          mt-5
          space-y-4
        "
      >
        <div>
          <label
            className="
              mb-2
              block
              text-sm
              font-semibold
              text-slate-200
            "
          >
            Seleccionar imagen
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={
              handleFileChange
            }
            disabled={
              busy ||
              processing ||
              cropping
            }
            className="
              block
              w-full
              rounded-xl
              border
              border-slate-700
              bg-slate-900
              p-3
              text-sm
              text-slate-300
            "
          />
        </div>

        {processing && (
          <div
            className="
              rounded-xl
              border
              border-blue-900
              bg-blue-950/30
              p-4
            "
          >
            <div
              className="
                mb-2
                flex
                justify-between
                text-sm
                text-blue-200
              "
            >
              <span>
                Eliminando fondo…
              </span>

              <span>
                {progress}%
              </span>
            </div>

            <div
              className="
                h-2
                overflow-hidden
                rounded-full
                bg-slate-800
              "
            >
              <div
                className="
                  h-full
                  bg-blue-500
                  transition-all
                "
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <p
              className="
                mt-2
                text-xs
                text-slate-400
              "
            >
              La primera vez puede
              tardar más porque el
              navegador descarga el
              modelo de IA.
            </p>
          </div>
        )}

        {message && (
          <div
            className="
              rounded-xl
              border
              border-emerald-800
              bg-emerald-950/30
              px-4
              py-3
              text-sm
              text-emerald-300
            "
          >
            {message}
          </div>
        )}

        {error && (
          <div
            className="
              rounded-xl
              border
              border-red-900
              bg-red-950/30
              px-4
              py-3
              text-sm
              text-red-300
            "
          >
            {error}
          </div>
        )}

        <div
          className="
            flex
            flex-col
            gap-3

            sm:flex-row
          "
        >
          <button
            type="button"
            onClick={
              handleRemoveBackground
            }
            disabled={
              !file ||
              busy ||
              processing ||
              cropping
            }
            className="
              rounded-xl
              bg-violet-600
              px-5
              py-3
              text-sm
              font-bold
              text-white
              transition

              hover:bg-violet-500

              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {processing
              ? "Procesando…"
              : "Eliminar fondo"}
          </button>

          <button
            type="submit"
            disabled={
              !processedBlob ||
              busy ||
              processing ||
              cropping
            }
            className="
              rounded-xl
              bg-blue-600
              px-5
              py-3
              text-sm
              font-bold
              text-white
              transition

              hover:bg-blue-500

              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {busy
              ? "Guardando…"
              : "Guardar recorte final"}
          </button>

          {currentPhotoUrl && (
            <button
              type="button"
              onClick={
                handleDelete
              }
              disabled={
                busy ||
                processing ||
                cropping
              }
              className="
                rounded-xl
                border
                border-red-800
                bg-red-950/30
                px-5
                py-3
                text-sm
                font-bold
                text-red-300
                transition

                hover:bg-red-950/60

                disabled:opacity-50
              "
            >
              Eliminar foto actual
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function PreviewCard({
  title,
  previewBox,
  children,
}: {
  title: string;
  previewBox: string;
  children:
    ReactNode;
}) {
  return (
    <div>
      <div
        className="
          mb-2
          text-xs
          font-semibold
          uppercase
          tracking-wide
          text-slate-500
        "
      >
        {
          title
        }
      </div>

      <div
        className={
          previewBox
        }
      >
        {
          children
        }
      </div>
    </div>
  );
}

function Placeholder({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <div
      className="
        px-4
        py-20
        text-center
        text-sm
        text-slate-500
      "
    >
      {
        children
      }
    </div>
  );
}