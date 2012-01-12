var LZW = function(dictBits) {return ({
    compress: function (uncompressed) {
        "use strict";
        // Build the dictionary.
        var i,
            dictionary = {},
            c,
            wc,
            w = "",
            result = [],
            dictWidth = dictBits + 1,
            clear = 1 << dictBits,
            stop = clear + 1,
            available = stop + 1;
        for (i = 0; i < (1<<dictBits); i += 1) {
            dictionary[String.fromCharCode(i)] = i;
        }
 
        for (i = 0; i < uncompressed.length; i += 1) {
            c = uncompressed.charAt(i);
            wc = w + c;
            if (dictionary[wc]) {
                w = wc;
            } else {
                result.push(dictionary[w]);
                // Add wc to the dictionary.
                dictionary[wc] = available++;
                if(available >= 1 << dictWidth) {
                  dictWidth++; 
                }
                w = String(c);
            }
        }
 
        // Output the code for w.
        if (w !== "") {
            result.push(dictionary[w]);
        }
        return result;
    },

    compress2: function (uncompressed) {
        "use strict";
        // Build the dictionary.
        var i,
            dictionary = {},
            c,
            wc,
            w = "",
            result = [],
            resultWidths = [],
            dictWidth = dictBits + 1,
            clear = 1 << dictBits,
            stop = clear + 1,
            available = stop + 1;
        for (i = 0; i < (1<<dictBits); i += 1) {
            dictionary[String.fromCharCode(i)] = i;
        }
 
        for (i = 0; i < uncompressed.length; i += 1) {
            c = uncompressed.charAt(i);
            wc = w + c;
            if (dictionary[wc]) {
                w = wc;
            } else {
                // Add wc to the dictionary.
                dictionary[wc] = available++;
                if(available >= 1 << dictWidth) {
                  dictWidth++; 
                }
                resultWidths.push(dictWidth);
                result.push(dictionary[w]);
                w = String(c);
            }
        }
 
        // Output the code for w.
        if (w !== "") {
            resultWidths.push(dictWidth);
            result.push(dictionary[w]);
        }
        return [result, resultWidths];
    },
 
 
    decompress: function (compressed) {
        "use strict";
        // Build the dictionary.
        var i,
            dictionary = [],
            w,
            result,
            dictWidth = dictBits + 1,
            clear = 1 << dictBits,
            stop = clear + 1,
            available = stop + 1, 
            k,
            entry = "";
        for (i = 0; i < (1 << dictBits); i += 1) {
            dictionary[i] = String.fromCharCode(i);
        }
 
        w = String.fromCharCode(compressed[0]);
        result = w;
        for (i = 1; i < compressed.length; i += 1) {
            k = compressed[i];
            if (dictionary[k]) {
                entry = dictionary[k];
            } else {
                if (k === available) {
                    entry = w + w.charAt(0);
                } else {
                    return null;
                }
            }
 
            result += entry;
 
            // Add w+entry[0] to the dictionary.
            dictionary[available++] = w + entry.charAt(0);
            if(available >= 1 << dictWidth) {
                dictWidth++; 
            }

 
            w = entry;
        }
        return result;
    },
    decompress2: function (compressed) {
        "use strict";
        // Build the dictionary.
        var i,
            dictionary = [],
            w,
            result,
            resultWidths = [],
            dictWidth = dictBits + 1,
            clear = 1 << dictBits,
            stop = clear + 1,
            available = stop + 1, 
            k,
            entry = "";
        for (i = 0; i < (1 << dictBits); i += 1) {
            dictionary[i] = String.fromCharCode(i);
        }
 
        w = String.fromCharCode(compressed[0]);
        result = w;
        resultWidths.push(dictWidth);
        for (i = 1; i < compressed.length; i += 1) {
            k = compressed[i];
            if (dictionary[k]) {
                entry = dictionary[k];
            } else {
                if (k === available) {
                    entry = w + w.charAt(0);
                } else {
                    return null;
                }
            }
 
            result += entry;
            resultWidths.push(dictWidth);
 
            // Add w+entry[0] to the dictionary.
            dictionary[available++] = w + entry.charAt(0);
            if(available >= 1 << dictWidth) {
                dictWidth++; 
            }

 
            w = entry;
        }
        return [result, resultWidths];
    }
});}; // For Test Purposes

var octetsToString = function(octets) {
  var result = [];
  for(var i = 0; i < octets.length; i++) {
    result.push(String.fromCharCode(octets[i] & 0xFF));
  }
  return result.join(""); 
};

var case0 = function() {
  test("TOBEORNOTTOBEORTOBEORNOT", 7); 
};
var case1 = function() {
  var testString = octetsToString(0, 1, 0, 2, 0, 3, 1, 0, 3, 0, 2);
  var testLength = 3;
  testBin(testString, testLength);
};

var test = function(s, L) {
  var comp = LZW(L).compress2(s);
  var decomp = LZW(L).decompress2(comp[0]);
  document.write(comp[0] + '<br>' + comp[1] + '<br>' + decomp[0]+ '<br>' + decomp[1]);
};
var toOctets = function(x) {
  var result = [];
  for(var i = 0; i < x.length; i++)
    result.push(x.charCodeAt(i) & 0xFF);
  return result;
};
var testBin = function(s, L) {
  var comp = LZW(L).compress2(s);
  var decomp = LZW(L).decompress2(comp[0]);
  decomp[0] = toOctets(decomp[0]);
  document.write(comp[0] + '<br>' + comp[1] + '<br>' + decomp[0]+ '<br>' + decomp[1]);
}

case1();
