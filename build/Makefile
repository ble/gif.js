
BUILD=java -jar ../plovr.jar build

OUTDIR=../build
SRCS=config.json gif-config.json gif-renderer-config.json
COMPILATIONS=${SRCS:.json=.js} 

.SUFFIXES: .js .json

.json.js :
	@$(BUILD) $< > $*.js

all : $(COMPILATIONS)
	cp *.js $(OUTDIR)

clean :
	rm *.js $(OUTDIR)/*.js
