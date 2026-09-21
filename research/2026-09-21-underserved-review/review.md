# Worldwide AI cervical screening: focused literature update

Reviewed 21 September 2026. This is a multilingual scoping update, not an exhaustive systematic review or meta-analysis. No records were imported during this reporting pass.

## Approach

Targeted web discovery across PubMed/PMC, journal publishers, ClinicalTrials.gov, NIH RePORTER, university repositories and regional-language journals. Searches combined cervical screening, AI/automated visual evaluation, rural/community/low-resource settings and geographic names. This pass used English, Chinese, French, Spanish, Portuguese, Indonesian, Russian, Thai and Swahili queries. Primary publications support findings below; announcements and registrations identify leads only. Some full-text pages were unavailable. No claim of exhaustive database retrieval or complete language coverage is made.

Compared titles, identifiers, locations and program identities against the 47-record catalog snapshot at /private/tmp/atlas-review-catalog.json. Fresh live-catalog comparison and cohort verification remain required immediately before any import. Shared technology alone does not establish a duplicate; shared cohorts or program follow-ups should be attached to existing records where appropriate.

## Additional studies and their appropriate interpretation

| Study | Evidence and reported outcome | Assessment / atlas action |
|---|---|---|
| [Baoding rural screening, China, 2024](https://doi.org/10.12259/j.issn.2095-610X.S20241021) | AI-assisted cytology in 10,865 rural women; 863 abnormal cytology results, 542 colposcopies, 20 high-grade lesions and one cervical cancer reported. | New regional program candidate. Historical comparisons cannot establish causal improvement. Follow-up incompleteness matters. Chinese original title: 保定市3个县农村妇女人工智能辅助宫颈癌筛查结果分析. |
| [Xuzhou rural screening, China, 2022](https://xb.xzhmu.edu.cn/cn/article/pdf/preview/10.3969/j.issn.2096-3882.2022.04.007.pdf) | 25,007 manually read smears versus 54,353 AI-assisted smears, including an AI-plus-HPV group. Abnormal cytology detection was 2.78% versus 5.07%. | New regional cohort candidate. Detection positivity is not sensitivity or proof of improved cancer survival; retrospective groups and selective biopsy limit comparison. Use journal year 2022, not the aggregator's 2025 posting date. Original: 人工智能辅助宫颈细胞学筛查联合HPV分流在宫颈癌人群筛查中的应用分析. |
| [Multicontrast Pocket Colposcopy, 2022](https://pubmed.ncbi.nlm.nih.gov/37850189/) | Paired acetic-acid/green-light images from 880 referral visits; reported AUC 0.87, sensitivity 75%, specificity 88%. | New program candidate. Selected referral population; not population screening effectiveness. Important correction to preliminary notes: the full text describes a six-country pooled dataset, not exclusively Peru/Honduras. Verify exact participating-country list before placing markers. |
| [West Bandung community screening, Indonesia, 2026](https://doi.org/10.2147/IJWH.S585614) | 71 women; AI sensitivity 66.7%, specificity 95.6% against VIA. Hybrid workflow specificity 97.1%. | Additional clinical report, subject to device/cohort reconciliation with existing Indonesian entries. VIA is an imperfect reference, not histology-confirmed CIN2+. Very wide sensitivity interval (20.8–93.9%). Single-point AUC should not be treated as a full discrimination analysis. |
| [Kigali cervical histopathology, Rwanda, 2026](https://doi.org/10.1186/s12885-026-16076-1) | EfficientNetB0 reported image-test accuracy 99%, sensitivity 98%, specificity 100%, AUC 0.99. | New laboratory-study candidate, separate from CerviScanner. It classifies biopsy images; it is not evidence of community screening or treatment benefit. Patient-level split, sample provenance and external validation need close review before import. |
| [Khayelitsha implementation preparation, South Africa, 2022](https://www.frontiersin.org/journals/health-services/articles/10.3389/frhs.2022.1000150/full) | Two providers screened 75 women while assessing imaging devices and implementation conditions. NIH/NCI supported the work. | New implementation-context candidate. Useful for workflow/infrastructure lessons; not an AI diagnostic-accuracy success report. |
| [TeleOTIVA engineering publication, Indonesia, 2025](https://comengapp.unsri.ac.id/index.php/comengapp/article/view/1197) | Published system-development report, with a separate clinical conference abstract. | Candidate program, but reconcile reports and validate clinical denominators before import. Engineering model accuracy must not substitute for patient-level diagnostic accuracy. [Original Indonesian ministry description](https://www.badankebijakan.kemkes.go.id/menuju-masa-depan-pelayanan-kesehatan-dengan-teleotiva/) is contextual, not the clinical outcome source. |

## Existing programs: enrich rather than duplicate

- **African AVE Collaborative:** [five-country prospective report](https://doi.org/10.1016/S2214-109X(25)00352-3), 24,447 eligible women, 18,086 with confirmed final status. AVE sensitivity 60.1% and specificity 81.9%; VIA sensitivity 36.6%, specificity 94.2%. Combined AVE-or-VIA sensitivity 71.8%, specificity 79.0%. This shows a sensitivity/specificity trade-off, not elimination of missed disease. Already represented in Project 07.
- **Zambia AVE development:** [2024 internal validation](https://doi.org/10.1002/cam4.7355), 8,204 women at eight public facilities; AUC 0.91, sensitivity 85%, specificity 86% at a selected threshold. Keep separate study-level results within the program; do not directly compare these internal estimates with later external field estimates as though populations and thresholds were identical.
- **PRESCRIP-TEC / SAKHI:** [September 2026 implementation study](https://formative.jmir.org/2026/1/e81493), 1,183 HPV-positive women in Bangladesh/Uganda. Reports field-performance and image-quality challenges, staff training needs and operational constraints. Already represented in Project 03; useful supporting evidence rather than a new project. The AI detects anomalies for further examination, not exclusively precancer.
- **Smart Scope CX:** [primary-care feasibility report](https://pmc.ncbi.nlm.nih.gov/articles/PMC12999539/) screened 871 women but only 40 had biopsy; performance on this subset must not be presented as fully verified population accuracy. Existing Project 22. [Earlier 2023 pilot](https://pmc.ncbi.nlm.nih.gov/articles/PMC10573017/) uses a CIN1+ endpoint, unlike CIN2+ in many other studies.
- **UIS Colombia:** [PMID 41410328](https://pubmed.ncbi.nlm.nih.gov/41410328/) resolves to DOI 10.7705/biomedica.7651, already linked in Project 40. A different identifier is not a new study.
- **NAAMII Nepal:** [2026 preprint](https://arxiv.org/abs/2606.15019) is a follow-up lead for Project 45, not automatically a new program.

## Hold / exclude from claims of successful deployment

- [Rwanda AI-VIA preprint](https://doi.org/10.21203/rs.3.rs-9418957/v1): 251 women; sensitivity 33.3% and specificity 92.2% versus expert consensus. Not peer reviewed; no histological reference. Important counter-evidence, pending program identity reconciliation.
- [Senegal SAGO 2025 abstract C149](https://ghpl.co/wp-content/uploads/2025/12/LIVRE-DES-RESUMES-SAGO-2025.pdf), page 197: 4,955 images, not necessarily women; reported category percentages total 106.6%. Hold numerical outcomes for clarification. Original title: APPORT DE L’INTELLIGENCE ARTIFICIELLE DANS LE DEPISTAGE DU CANCER DU COL UTERIN AU SENEGAL.
- [Bangladesh NCT06644248](https://clinicaltrials.gov/study/NCT06644248): registered study, no posted results; not an observed success.
- [Thai model comparison](https://ph02.tci-thaijo.org/index.php/project-journal/article/view/252374): uses a Venezuelan dataset. Do not map it as a Thai patient screening program.
- [Nigerian ANN paper](https://doi.org/10.33003/fjs-2025-0905-3626): retain as a lead until clinical dataset provenance and validation are checked; the title alone does not establish Nigerian deployment.
- [Samara Russian pilot](https://archivog.com/2313-8726/article/view/713820/ru_RU): accepted/in-press organizational report; clinical outcome verification remains incomplete.
- Non-AI HPV self-sampling, reviews, grants, radiotherapy planning and purely technical benchmark studies are not evidence of AI-assisted early-screening effectiveness. They must not inflate the count of successful clinical programs.

## Language and reporting rules

Store English editorial summaries as the default. Preserve original published titles and concise source-language summaries where a non-English source exists, clearly distinguishing paraphrases from quotations. Do not invent a local-language original for a paper published in English. Separate patient examinations, cytology-slide analysis, biopsy histopathology, risk models and implementation research. State the reference standard, denominator, endpoint and study design with each metric.

## Overall assessment

The strongest practical evidence supports diagnostic assistance and task-sharing potential, with considerable variation between internal validation and field use. More abnormal findings do not automatically mean more true precancers detected. Few reports here directly demonstrate improved treatment completion, reduced invasive cancer incidence or lower mortality attributable to AI. A staged atlas update should prioritize the two Chinese regional cohorts and the Pocket Colposcopy report once its geography is verified, attach follow-ups to existing records, and label weaker evidence explicitly.
