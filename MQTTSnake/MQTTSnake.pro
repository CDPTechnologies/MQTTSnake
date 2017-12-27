CDPVERSION = 4.4
TYPE = system
load(cdp)

DISTFILES += $$files(*.xml, false)

SUBDIRS += \
    MQTTSnakeApp
