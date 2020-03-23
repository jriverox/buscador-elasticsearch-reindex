module.exports = {
  DELAY_MILISECONDS: 10000,
  NAME_INDEX_LOG: "log_reindexacion",
  PERSONALIZATION: [
    "LAN",
    "LMG",
    "HV",
    "LIQ",
    "CAT",
    "SR",
    "OPM",
    "OPT",
    "ODD",
    "REV"
  ],
  ELASTICSEARCH: {
    INDEX_PATTERN: "producto_v2",
    NEW_INDEX_PATTERN: "producto_v3",
    CLUSTERS: [
      {
        ID: 1,
        ENDPOINT:
          "https://vpc-es-sbsearch-prd-a5xq7pyb6cvphjra33ojtejvwa.us-east-1.es.amazonaws.com/",
        COUNTRIES: ["PE", "CL", "CR", "GT"]
      },
      {
        ID: 2,
        ENDPOINT:
          "https://vpc-es-sbsearch2-prd-zy7ytdwgfleiwpive3meis5lzy.us-east-1.es.amazonaws.com/",
        COUNTRIES: ["CO", "PA", "DO", "SV"]
      },
      {
        ID: 3,
        ENDPOINT:
          "https://vpc-es-sbsearch3-prd-x6yhgte2h3opuz5lyog56xwtla.us-east-1.es.amazonaws.com/",
        COUNTRIES: ["MX", "EC", "BO", "PR"]
      }
    ]
  },
  CAMPAIGNS_BY_COUNTRIES: {
    PR: ["202004", "202005"],
    DEFAULT: ["202005", "202006"]
  }
};
