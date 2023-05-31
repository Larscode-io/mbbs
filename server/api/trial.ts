import fetch from "node-fetch";
import cheerio from "cheerio";

import {
  makeRechPlPostRequest,
  getRechPlMetaInfo,
  getSelectElements,
  prepareListBodyPlRequest,
  makeArticlePlPostRequest,
} from "../../src/util/index";

export default defineEventHandler(async (event) => {
  // Opzoeking met rech.pl
  const searchQuery1 = {
    rech: "Opzoeking",
    trier: "afkondiging",
    dt: "",
    ddda: "",
    dddm: "",
    dddj: "",
    ddfa: "",
    ddfm: "",
    ddfj: "",
    pdda: "",
    pddm: "",
    numac: "",
    bron: "GRONDWETTELIJK HOF",
    htit: "",
    text1: "lavrysen",
    choix1: "EN",
    text2: "",
    choix2: "EN",
    text3: "",
    exp: "",
    nl: "n",
    fr: "f",
    du: "d",
    language: "nl",
  };
  // Query for list of 100 records
  // row_id needs to be added (1, 101, 201, etc.)
  let searchQuery2 = {
    language: "nl",
    du: "d",
    fr: "f",
    choix1: "EN",
    choix2: "EN",
    fromtab: " moftxt UNION montxt UNION modtxt",
    nl: "n",
    trier: "afkondiging",
    bron: "GRONDWETTELIJK HOF",
    text1: "lavrysen",
    sql: "bron ='GRONDWETTELIJK HOF' and ( ( htit contains  ( 'lavrysen')      ) or ( text contains  ( 'lavrysen')      ) )",
    rech: "2137",
    tri: "dd AS RANK ",
    dt: "",
    ddda: "",
    dddm: "",
    dddj: "",
    ddfa: "",
    ddfm: "",
    ddfj: "",
    pdda: "",
    pddm: "",
    pddj: "",
    pdfa: "",
    pdfm: "",
    pdfj: "",
    numac: "",
    exp: "",
  };

  const html = await makeRechPlPostRequest(searchQuery1);
  const { nrDocsFound, nrSourcesFound, nrWordsFound } = getRechPlMetaInfo(html);
  // log the results with the var name before output
  console.log("nrDocsFound", nrDocsFound);
  console.log("nrSourcesFound", nrSourcesFound);
  console.log("nrWordsFound", nrWordsFound);

  const [optionListF, optionListN] = await Promise.all([
    getSelectElements("f"),
    getSelectElements("n"),
  ]);
  const recordGetter = prepareListBodyPlRequest(searchQuery2);
  let records = await recordGetter.next(1);
  records = await recordGetter.next(2);
  records = await recordGetter.next(34);

  // parameters can be found in records.formInputValues
  // call makeArticlePlPostRequest with parameters for all records
  // and add pdfUrl to records

  records = await Promise.all(
    records.map(async (record) => {
      const parameters = record.formInputValues;
      const response = await makeArticlePlPostRequest(parameters);
      // we add pdfUrl to the record
      record.pdfUrl = response.pdfUrl;
      //
      return record;
    })
  );
  const preUrl = "https://www.ejustice.just.fgov.be";
  const details = records.map((record) => {
    const pdfUrl = record.pdfUrl ? preUrl + record.pdfUrl : null;
    return {
      pub: record.pub || null,
      pdfUrl,
      text: record.text || null,
    };
  });

  return {
    nrDocsFound,
    nrSourcesFound,
    nrWordsFound,
    details,
  };
});

// http://localhost:3000/api/trial
