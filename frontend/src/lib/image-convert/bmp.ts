function canvasToBmp(canvas: HTMLCanvasElement): Blob {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Não foi possível gerar o BMP');
  }

  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const rowSize = width * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4d);
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 32, true);
  view.setUint32(34, pixelDataSize, true);

  let offset = 54;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      view.setUint8(offset, imageData.data[index + 2]);
      view.setUint8(offset + 1, imageData.data[index + 1]);
      view.setUint8(offset + 2, imageData.data[index]);
      view.setUint8(offset + 3, imageData.data[index + 3]);
      offset += 4;
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

export { canvasToBmp };
