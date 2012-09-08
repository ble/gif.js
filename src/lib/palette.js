goog.provide('ble.palette');

ble.palette.imageDataToPixels = function(dataIn, pixelsOut, inversePalette) {
  for(var i = 0; i < (dataIn.length >> 2); i++) {
    inversePalette(dataIn, i << 2, pixelsOut, i);
  } 
};

ble.palette.inverseGreyscale = function(img, imgIx, pal, palIx) {
  pal[palIx] = Math.round((img[imgIx] + img[imgIx+1] + img[imgIx+2])/3);
};

ble.palette.inverseMonochrome = function(img, imgIx, pal, palIx) {
  pal[palIx] =
    (img[imgIx + 0] == 255 &&
     img[imgIx + 1] == 255 &&
     img[imgIx + 2] == 255) ? 1 : 0; 
};

