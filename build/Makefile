
BUILD=java -jar plovr.jar build

OUTDIR=../build
SRCS=$(wildcard ../config/*.json)
COMPILATIONS=${SRCS:.json=.js} 

.SUFFIXES: .js .json

.json.js :
	@$(BUILD) $< > $*.js

all : $(COMPILATIONS)
	cp $(COMPILATIONS) $(OUTDIR)/
	echo "Nothing more!"

clean :
	rm $(COMPILATIONS)
	rm *.js

serve :
	java -jar plovr.jar serve $(SRCS)
