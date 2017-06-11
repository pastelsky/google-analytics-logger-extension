import ext from "./utils/ext"
import queryString from 'query-string'

let entries = []

function parseClassicGAEventString(eventString) {
  let data = {
    category: null,
    action: null,
    value: null,
    label: null,
  }
  if (eventString.substr(0, 1) === '5') {
    if (eventString.includes(')8(')) eventString = eventString.substring(0, eventString.indexOf(')8(') + 1);
    if (eventString.includes(')9(')) eventString = eventString.substring(0, eventString.indexOf(')9(') + 1);
    if (eventString.includes(')11(')) eventString = eventString.substring(0, eventString.indexOf(')11(') + 1);
    eventString = eventString.substring(2, eventString.length - 1)
      .split(/\*|\)\(/);
    data.category = eventString[0];
    data.action = eventString[1];
    if (eventString.length > 2) {
      data.label = eventString[2];
      if (eventString.length > 3) {
        data.value = eventString[3];
      }
    }
  }

  return data
}

function processURL(req, isSuccess, isPost = false) {
  const params = queryString.parse(req.url)
  const isClassicGA = req.url.includes('__utm.gif')
  let data, classicGAData = {}

  if (isClassicGA) {
    classicGAData = parseClassicGAEventString(params.utme)
  }
  const commonData = {
    isClassic: isClassicGA,
    timestamp: params._utmht || params.utmht || Date.now(),
    isSuccess: isSuccess,
    action: params.ea || classicGAData.action,
    category: params.ec || classicGAData.category,
    label: params.el || classicGAData.label,
    value: params.ev || classicGAData.value,
    gaId: params.tid || params.utmac,
    id: params.z || params.utmhid,
    absoluteURL: params.dl,
    error: req.error,
    type: params.t || params.utmt,
    title: params.dt || params.utmdt,
    gtmId: params.gtm || params.utmgtm,
    tabId: req.tabId,
  }

  switch (params.t) {
    case 'timing':
      data = {
        ...commonData,
        userTimingCategory: params.utc,
        userTimingValue: params.utt,
        userTimingVariable: params.utv,
      }
      break;

    case 'social':
      data = {
        ...commonData,
        socialNetwork: params.sn,
        socialAction: params.sa,
        socialTarget: params.st,
      }
      break;

    case 'exception' :
      data = {
        ...commonData,
        exceptionDesc: params.exd,
        exceptionFatal: params.exf,
      }
      break;

    case 'pageview' : {
      data = {
        ...commonData,
        relativeURL: params.dp || params.utmp,
      }
    }
      break;

    case 'event':
    default:
      data = {
        ...commonData
      }
      break;
  }

  entries.push(data)
  ext.runtime.sendMessage({
    type: 'UPDATE_ENTRY',
    entries,
  })

  ext.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'PULL_ENTRIES':
        ext.runtime.sendMessage({
          type: 'UPDATE_ENTRY',
          entries,
        })
        break;

      case 'CLEAR_ENTRIES':
        entries = entries.filter(e => e.tabId !== message.tabId)
        break;
    }
  })
}

ext.webRequest.onHeadersReceived.addListener(
  (req) => processURL(req, true),
  {
    urls: [
      "*://*.google-analytics.com/collect?*",
      "*://*.google-analytics.com/r/collect?*",
      "*://*.google-analytics.com/__utm.gif?*",
    ],
  },
);


ext.webRequest.onErrorOccurred.addListener(
  (req) => processURL(req, false),
  {
    urls: [
      "*://*.google-analytics.com/collect?*",
      "*://*.google-analytics.com/r/collect?*",
      "*://*.google-analytics.com/__utm.gif?*",
    ],
  },
);