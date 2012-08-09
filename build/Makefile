
BUILD=java -jar ../plovr.jar build

#OUTDIR=../build
SRCS=bit-config.json config.json gif-config.json gif-renderer-config.json var-lzw-writer.json
COMPILATIONS=${SRCS:.json=.js} 

.SUFFIXES: .js .json

.json.js :
	@$(BUILD) $< > $*.js

all : $(COMPILATIONS)
	echo "Nothing more!"

clean :
	rm *.js
