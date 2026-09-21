# Worldwide AI cervical screening literature review

**Search cutoff: 20 September 2026.** Multilingual scoping review and curated Atlas update.

## What the evidence supports

AI-assisted cervical screening encompasses different interventions: neural-network cell selection, whole-slide cytology, photographic visual assessment, patient-record risk models, and communication or service support. They cannot be ranked using a single accuracy figure. Histology-confirmed CIN2+/CIN3+, cytology agreement, cell classification, service reach, and treatment completion are different endpoints.

The strongest practical evidence is often for assisted laboratory reading or triage, rather than autonomous population screening. Some studies report faster review and improved sensitivity, while older randomized trials found no gain or worse sensitivity. Results from isolated cells do not establish whole-slide or patient-level accuracy. Internal validation, selected abnormal specimens, incomplete biopsy verification, and reference diagnoses incorporating the index reader can inflate apparent performance. No cancer-mortality benefit from AI is established by this update.

## Search and selection

Three focused Europe PMC title/abstract searches retrieved 690 clinical, 154 historical automation, and 38 named-system citations: **804 unique source/identifier records** after deduplication. Exact queries and retrieval counts are in `search-log.json`; bibliographic metadata are in `retrieved-citations.csv`. This is a retrieved discovery corpus, not a claim that all 804 full texts underwent independent review. Automated title triage was followed by targeted abstract/full-text review of relevant clinical and local-validation candidates. Broader exploratory searches were used to identify leads but were capped and are not included in the screened denominator.

Coverage included Europe PMC/PubMed, accessible PubMed Central and publisher articles, NIHR reports, institutional research sources, and native-language discovery using Spanish, Portuguese, French, Russian, Chinese, Japanese, Arabic, Hindi and Swahili terms. No language restriction was applied to the focused searches. Non-English study titles and short editorial paraphrases are retained where verified, with English as the Atlas default. English-language publications from non-English-speaking countries do not automatically receive a translated-original label.

Relevant systematic reviews were used to identify research families and interpretation risks, including [the 2025 eClinicalMedicine review](https://doi.org/10.1016/j.eclinm.2024.102992) and [the 2026 role-stratified review](https://pubmed.ncbi.nlm.nih.gov/42343867/). Their pooled performance is not assigned to individual programmes.

**Limits:** This is a broad, reproducible scoping update, not a registered exhaustive systematic review, formal meta-analysis or dual-reviewer risk-of-bias assessment. Subscription-only Embase, Scopus and CNKI collections were not comprehensively searched. Web indexing and access limitations can miss local-language literature. Negative search results do not prove absence of a programme. Contact information is limited to published professional contacts and has not been called.

## Evidence units and dates

- **Patient examinations:** clinical screening, visual examination or care-pathway evaluation; specify whether prospective or retrospective and the reference standard.
- **Slide scans:** digitized cytology slides, including patient-derived specimens. This does not mean specimens are artificial; it means the reported evaluation unit is a slide.
- **Patient examinations and slide scans:** a screening programme or clinical cohort with both patient and laboratory outcomes.
- **Cell or image datasets:** selected images/cells without a validated complete examination workflow.
- **Patient records / risk modelling:** retrospective or prospective risk prediction from clinical records.
- **Implementation / service report:** feasibility, acceptability, service totals or modelled workload.
- **Protocol / planned study:** design without completed outcomes.

Publication year is the primary report’s year (online publication where explicitly documented), not the Atlas review date. A programme with additional reports retains their dates in its source labels and outcome text; the structured year is not a list of every related paper. Unverified years remain blank. “2025”, “year:2025” and “2020–2026” searches use this structured field.

## Additions assessed

Thirteen distinct studies are included below. Shared commercial technology alone does not make two independent clinical cohorts duplicates; reports of the same cohort/programme are grouped. The existing 34 Atlas records were checked by programme name, technology, location, citation and cohort description.

| Added study | Country | Year | Evidence basis | Main assessment | Source |
|---|---|---:|---|---|---|
| MAVARIC · randomized automation-assisted cervical cytology | United Kingdom | 2011 | Patient examinations and slide scans | 0.92: Relative CIN2+ sensitivity versus manual reading. 73,266 cervical samples; 48,578 paired readings. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/21146458/) |
| Finnish Papnet · randomized public-health screening | Finland | 2003 | Patient examinations and slide scans | No significant difference: First-year lesion detection versus conventional reading. 108,686 attendees: 72,461 conventional and 36,225 Papnet. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/12471627/) |
| Ontario FocalPoint GS · two-laboratory validation | Canada | 2013 | Slide scans | 10,233 slides: Laboratory validation; not a patient screening count. 10,233 current and seeded abnormal slides. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/23361915/) |
| BestCyte · Pinehurst cervical-slide reader validation | United States of America | 2023 | Slide scans | 94.65–95.88%: ASC-US+ sensitivity against consensus cytology. 500 ThinPrep slides; three cytologists; enriched abnormalities. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/36747889/) |
| Techcyte SureView · CorePlus digital cytology quality control | Puerto Rico | 2025 | Slide scans | 82% / 99%: Sensitivity / specificity in laboratory validation. 1,442 whole-slide images: 1,273 ThinPrep and 169 SurePath. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/40387263/) |
| UIS Bucaramanga · AI classification of cervical cell images | Colombia | 2025 | Cell or image datasets | 0.947: InceptionV3 AUC for cell-image abnormalities. 650 individual cell images; not 650 patient examinations. | [Primary report](https://revistabiomedica.org/index.php/biomedica/article/view/7651) |
| CYTOVISION PAP · Russian comparative digital cytology | Russia | 2021 | Slide scans | 2–8 minutes: Reported AI-assisted slide reading time. 1,775 women provided samples; 773 slides selected for digitization. | [Primary report](https://www.mediasphera.ru/issues/onkologiya-zhurnal-im-p-a-gertsena/2021/3/12305218X2021031011) |
| ECOSUR · low-cost automated cervical microscopy | Mexico | 2025 | Cell or image datasets | 97.95% / 88.72%: MobileNet test sensitivity / specificity. Nearly 2,000 cell-type images; patient count not established. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/40231005/) |
| Laverty Pathology · Australian FocalPoint GS trial | Australia | 2012 | Slide scans | 0.2% vs 4.1%: Unsatisfactory specimens: SurePath/FocalPoint versus conventional. 2,198 routine split samples plus 38 seeded high-grade slides. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/22045553/) |
| Sydney PAPNET · randomized crossover cytology trial | Australia | 2004 | Slide scans | +1.29 percentage points: Sensitivity difference; 95% CI −5.79 to +8.36. 21,747 Pap smears; discordant results adjudicated. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/15019013/) |
| NAAMII / IISH · smartphone VIA screening research | Nepal | 2024 | Patient examinations | 59% / 25%: Sensitivity / specificity in the small biopsy subset. 1,430 women at 32 camps; only 25 biopsy results in the test subset. | [Primary report](https://arxiv.org/abs/2403.11936) |
| Debre Markos · machine-learning cervical risk in HIV care | Ethiopia | 2026 | Patient records / risk modelling | 0.68 AUC: Limited discrimination despite reported 98% accuracy. Secondary records from four antiretroviral clinics; not a new screening trial. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/42032352/) |
| CliniMed Kolkata · Android cervical-cell image analysis | India | 2026 | Cell or image datasets | 80.49%: Reported abnormal-cell classification in local images. 292 in-house microscopic Pap images plus public datasets. | [Primary report](https://pubmed.ncbi.nlm.nih.gov/41660918/) |

## Programme updates and duplicate handling

- **CerviCARE:** the 2026 Vietnamese community study is added to the existing Korean validation programme, with Vietnam on the map. It is not a second programme entry. The Vietnamese evaluation measures agreement with VIA, not histological disease accuracy. [Vietnam report](https://pubmed.ncbi.nlm.nih.gov/42614822/).
- Existing Bombo, ASPIRE, PRESCRIP-TEC, Cameroon, African AVE, Hubei/Landing, Kinondo, nGyn, CerviScanner, CYTOREADER, Genius, CytoProcessor, Cerviray, AICCS, PUMCH, Smart Scope, GynAIe, CAIADS, PAVE, CITOBOT, Nodos Rosa, CYBO, Karolinska and TruScreen records remain grouped rather than being recreated from rediscovered publications.
- The 34 existing records receive explicit evidence-unit and primary-year metadata based on their cited reports. Dawa’s undated web claim retains an unknown publication year. Sample descriptions distinguish cells, slides and patients. Historical or preliminary status is retained.
- Papers from the same programme can share patients across analyses; totals must not be summed without cohort-overlap checks.

## Leads withheld or treated as context

| Lead | Decision / reason |
|---|---|
| Iran CIN-severity modelling, PMID 41053665 | Relevant retrospective modelling lead; retained for further quantitative extraction, not added as a verified clinical screening success. |
| Zambia AVE internal validation, PMID 38872398 | Relevant to the existing African AVE research lineage; no new programme entry until cohort overlap and grouping are resolved. |
| New Chinese compact-microscope and CAIADS-related papers | Potential overlap with existing Landing/AICCS/CAIADS programmes; withheld from separate-entry counting pending cohort reconciliation. |
| Sechenov ViksTochkaAI 42-woman pilot | Selected abnormal examinations and expert-agreement reference; further source and programme verification required. |
| CLIAS/IECS Argentina remote-cytology feasibility | Project lead without verified completed diagnostic outcomes. |
| BUET Bangladesh registered study | Protocol/registry lead without verified posted results; not a completed screening success. |
| New commercial deployment announcements | Implementation claims alone do not establish comparative diagnostic outcomes. |
| Public Herlev/SIPaKMeD/UCI benchmark studies | Background methodology; not mapped as local patient programmes merely from author country. |
| Hindi health-agency tele-colposcopy reports | Digital follow-up is not automatically an AI diagnostic intervention; no unsupported AI attribution. |
| Swahili/Portuguese/Arabic discovery without qualifying primary outcomes | No invented local programme or translated-source record added. |
| Treatment planning, radiotherapy response, cervical-spine AI | Outside cervical precancer screening scope. |

## Interpretation for users

A useful implementation decision needs more than high image accuracy: patient-level external validation, verification of negatives as well as positives, clinically meaningful thresholds, false-positive referral burden, follow-up and treatment completion, costs, and independent evaluation. The new evidence-basis field makes these differences visible; the sample field preserves denominators. Historical trials and disappointing results remain visible because they help avoid overstating benefit.

## Reproducibility and change control

`proposed-records.json` contains the reviewed additions and metadata updates. The import must pass the Atlas preview, revision/conflict and duplicate checks before committing. A completed import appears in Global version history and can be undone using the existing protected undo flow, provided subsequent edits do not conflict. The import receipt records actual applied counts; this document does not substitute for that receipt.
