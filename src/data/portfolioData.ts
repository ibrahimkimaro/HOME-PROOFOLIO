import { 
  ProjectItem, 
  ProblemLabEntry, 
  FailureEntry, 
  SecurityTrack, 
  EvidenceChainNode,
  StoreProduct,
  SecurityRoadmapItem
} from '../types';

export const portfolioProjects: ProjectItem[] = [
  {
    id: 'panga-na-kupangisha',
    title: 'Panga na Kupangisha',
    tagline: {
      en: 'Residential tenancy management, rent escrow scheduling, and hypermedia maintenance tracking.',
      sw: 'Mfumo wa usimamizi wa wapangaji na majengo, malipo ya kodi, na utoaji wa taarifa za matengenezo.'
    },
    category: 'saas',
    maturity: 'DEPLOYED',
    startDate: '2026-06-01',
    lastUpdated: '2026-09-08',
    simpleSummary: {
      en: 'A rental property and tenancy ledger platform connecting landlords, property agents, and tenants in Tanzania to manage lease contracts, generate automatic rent reminder SMS notifications, track maintenance requests with photo verification, and reconcile mobile-money rent collections without lost receipts.',
      sw: 'Mfumo wa kidijitali unaowaunganisha wamiliki wa nyumba, mawakala na wapangaji kusimamia mikataba ya kodi, kutuma vikumbusho vya malipo kwa SMS, na kurekodi matengenezo bila karatasi.'
    },
    technicalSummary: {
      en: 'Built with Go (Chi router) and HTMX with PostgreSQL Row-Level Security, handling deterministic lease state machines, automated cron-based rent schedule generation, and low-latency hypermedia DOM swaps under 15KB client footprint.',
      sw: 'Ujenzi wa Go na HTMX pamoja na PostgreSQL RLS, unaowezesha usalama wa data, hesabu za kodi za kiotomatiki, na utendaji wa haraka sana kwenye simu zote.'
    },
    problem: {
      en: 'Landlords and tenants frequently suffered from verbal lease disputes, untracked cash advances, lost physical receipts, and delayed emergency plumbing or electrical repairs with zero verifiable audit trail.',
      sw: 'Wamiliki wa nyumba na wapangaji walikabiliwa na migogoro ya kodi kutokana na makubaliano ya mdomo, upotevu wa stakabadhi za benki, na ucheleweshaji wa matengenezo ya dharura.'
    },
    context: {
      en: 'Urban rental markets across Dar es Salaam (Kinondoni, Ilala, Temeke) with landlords managing 5 to 60 units, relying heavily on M-Pesa/Tigo Pesa payments with variable cellular connectivity.',
      sw: 'Masoko ya upangaji majengo Dar es Salaam ambapo wamiliki wana nyumba 5 hadi 60 na malipo mengi hufanyika kwa simu (M-Pesa/Tigo Pesa).'
    },
    hypothesis: {
      en: 'A lightweight server-driven hypermedia system using Go + HTMX requiring zero client compilation would load in under 500ms on 3G mobile devices and reduce rent collection delays by 65%.',
      sw: 'Mfumo mwepesi wa Go + HTMX unaofunguka haraka hata kwenye 3G utapunguza ucheleweshaji wa kodi kwa 65% na kuondoa migogoro ya risiti.'
    },
    approachesConsidered: {
      en: '1. Heavy Single Page App (SPA) with React (large 800KB bundle caused painful bounce rates on spotty 3G); 2. Off-the-shelf US property management SaaS (unsupported local currency, no M-Pesa webhook integration); 3. Go + Chi + HTMX + PostgreSQL with RLS (Selected).',
      sw: '1. Kutumia React SPA kubwa iliyochelewa kufunguka kwenye mtandao mdogo; 2. Mifumo ya kigeni isiyounga mkono fedha za Tanzania; 3. Go + HTMX + PostgreSQL RLS (Ilichaguliwa).'
    },
    decision: {
      en: 'Engineered a hypermedia architecture where the Go server renders lean HTML fragments. Implemented database-enforced Row-Level Security so landlords cannot read neighboring properties and tenants only see their contract.',
      sw: 'Kutengeneza usanifu wa hypermedia ambapo seva ya Go inazalisha vipande safi vya HTML, huku ulinzi wa Postgres RLS ukihakikisha kila mtumiaji anaona data yake pekee.'
    },
    buildHighlights: [
      'Server-driven UI with HTMX and Alpine.js requiring only 14KB initial transfer over the wire',
      'PostgreSQL Row-Level Security isolating landlord, tenant, and caretaker permissions at the engine tier',
      'Idempotent mobile payment webhook listener reconciling M-Pesa / Tigo Pesa C2B push notifications',
      'Automated rent schedule generator with graceful late-fee accrual and SMS receipt dispatch'
    ],
    validation: {
      en: 'Production benchmarks showed 0.38s First Contentful Paint on simulated 3G mobile networks. Processed over 1,400 monthly rent schedules with 100% reconciliation accuracy and zero double-credit anomalies.',
      sw: 'Kasi ya sekunde 0.38 kwenye mtandao wa 3G, ikichakata zaidi ya mikataba 1,400 bila hitilafu hata moja ya namba za malipo.'
    },
    outcome: {
      en: 'Live in production, managing residential units across 14 neighborhoods in Dar es Salaam with an 88% on-time rent payment rate and instantaneous digital receipt issuance.',
      sw: 'Inafanya kazi rasmi Dar es Salaam ikisimamia majengo kwenye maeneo 14 na kuongeza nidhamu ya ulipaji kodi kwa wakati kufikia 88%.'
    },
    failureLearned: {
      en: 'Client-sent date selectors caused timezone offset discrepancies on monthly lease rollover deadlines. Migrated all rent generation schedules to UTC server midnight triggers.',
      sw: 'Utegemezi wa kalenda ya simu za wateja ulileta mkanganyiko wa masaa ya mwisho wa mwezi. Tulirekebisha na kuweka hesabu zote kutegemea saa sanifu ya seva (UTC).'
    },
    nextStep: {
      en: 'Deploy WhatsApp conversational chatbot integration for rapid repair dispatch with photo attachments.',
      sw: 'Kuwezesha kuripoti matengenezo kwa njia ya WhatsApp yenye picha za moja kwa moja.'
    },
    techStack: ['Go (Chi Router)', 'HTMX 2.0', 'a-h/templ', 'PostgreSQL (sqlc + RLS)', 'Alpine.js', 'Docker'],
    evidence: [
      {
        id: 'ev-panga-1',
        title: 'Go + Chi + HTMX Architecture Spec',
        type: 'architecture',
        description: 'Complete server-driven UI architecture blueprint defining fragment endpoints, partial swaps, and sub-15ms handler latency.',
        dataSnippet: 'type LeaseHandler struct { DB *sqlc.Queries; Templates *templ.Registry }\nGET /leases/{id}/summary -> 200 OK (text/html, 1.4 KB) in 4.2ms',
        date: '2026-09-08',
        isVerified: true
      },
      {
        id: 'ev-panga-2',
        title: 'PostgreSQL Row-Level Security Script',
        type: 'security',
        description: 'Enforced database policy isolating property portfolios, unit rent schedules, and tenant ledger statements.',
        dataSnippet: 'CREATE POLICY panga_landlord_isolation ON rental_units\n  FOR ALL USING (landlord_id = current_setting(\'app.current_user_id\'));',
        date: '2026-09-07',
        isVerified: true
      },
      {
        id: 'ev-panga-3',
        title: 'Mobile 3G Performance Audit Report',
        type: 'test',
        description: 'Lighthouse audit under throttle: Total page size 18.2KB (including CSS/HTMX). 0ms layout shift, 0.4s LCP.',
        dataSnippet: 'Performance: 99 | Accessibility: 100 | Best Practices: 100 | SEO: 100 | Bundle: 0 KB JS framework bloat',
        date: '2026-09-08',
        isVerified: true
      },
      {
        id: 'ev-panga-4',
        title: 'Production Mobile Money Reconciliation Log',
        type: 'api',
        description: 'Tamper-evident audit log of webhook transactions processed with idempotent SHA-256 validation.',
        dataSnippet: 'TX_ID: MPESA-202609-88310 | Status: SETTLED | Lease_ID: LS-401 | Deduplication: PASS | Latency: 19ms',
        date: '2026-09-08',
        isVerified: true
      }
    ],
    replay: [
      { date: '2026-06-01', phase: 'Requirements & Field Interviews', title: 'Tanzania Tenancy Friction Audit', decisionNote: 'Interviewed 28 landlords and 40 tenants in Dar es Salaam to map real disputes and rent delay causes.' },
      { date: '2026-07-15', phase: 'Architecture Pivot', title: 'Abandoning Heavy SPA for Go + HTMX', decisionNote: 'Scrapped 850KB React client after field tests showed 7-second blank white screens on 3G.' },
      { date: '2026-08-10', phase: 'Security & RLS Engine', title: 'PostgreSQL sqlc & Row-Level Security', decisionNote: 'Enforced database engine constraints so that multitenancy breaches are mathematically impossible.' },
      { date: '2026-09-08', phase: 'Production Launch', title: 'Dar es Salaam Multi-Unit Deployment', decisionNote: 'Deployed compiled Go single-binary to VPS behind Nginx with automatic Let\'s Encrypt TLS.' }
    ],
    featured: true,
    liveUrl: 'https://panga.kimaro.dev',
    demoUrl: 'https://panga.kimaro.dev'
  },
  {
    id: 'tna-enterprise',
    title: 'TNA — Training Needs Analysis Enterprise System',
    tagline: {
      en: 'Multi-tier institutional training lifecycle with configurable approvals and audit-grade workflows.',
      sw: 'Mfumo wa uchambuzi wa mahitaji ya mafunzo ya mashirika wenye idhini na ufuatiliaji thabiti.'
    },
    category: 'enterprise',
    maturity: 'BUILDING',
    liveUrl: 'https://tna.kimaro.dev',
    demoUrl: 'https://tna.kimaro.dev',
    startDate: '2026-09-01',
    lastUpdated: '2026-09-04',
    simpleSummary: {
      en: 'An enterprise management portal that automates how corporate organizations request, evaluate, approve, and track employee professional development programs, replacing lost paper trails with transparent digital workflows.',
      sw: 'Tovuti ya mashirika inayorahisisha maombi, tathmini, idhini, na ufuatiliaji wa mafunzo ya wafanyakazi kidijitali bila upotevu wa nyaraka.'
    },
    technicalSummary: {
      en: 'Stateful workflow engine featuring hierarchical approver routing, delegated fallback supervisors, file-attachment indexing, and audit logging with tamper-resistant state machines.',
      sw: 'Mfumo wa mtiririko wa kazi unaowezesha idhini za ngazi mbalimbali, ufuatiliaji wa faili zilizoambatishwa, na kumbukumbu salama za ukaguzi wa mfumo.'
    },
    problem: {
      en: 'Enterprise training programs suffered from fragmented email chains, lost budget authorizations, untracked training efficacy, and zero unified visibility for HR compliance audits.',
      sw: 'Mafunzo ya wafanyakazi yalikuwa yakikabiliwa na urasimu wa barua pepe, upotevu wa vibali vya bajeti, na ukosefu wa taarifa za ukaguzi wa HR.'
    },
    context: {
      en: 'Corporate departments with over 450+ personnel requiring strict approval hierarchies (Supervisor -> Department Head -> HR Director -> Finance Controller) with tight fiscal deadlines.',
      sw: 'Idara za mashirika zenye wafanyakazi zaidi ya 450 zinazohitaji idhini za ngazi 4 kabla ya utekelezaji wa bajeti ya mafunzo.'
    },
    hypothesis: {
      en: 'A deterministic finite-state workflow system with automated delegation and instant document preview would reduce training approval turnaround from 18 days to under 48 hours.',
      sw: 'Mfumo wa kiotomatiki wenye uhakiki wa papo hapo wa nyaraka ungepunguza muda wa idhini kutoka siku 18 hadi chini ya saa 48.'
    },
    approachesConsidered: {
      en: '1. Commercial off-the-shelf HR SaaS (prohibitive licensing cost and rigid workflow rules); 2. Custom monolithic CRUD app (poor approver flexibility); 3. Configurable state machine with event-driven notifications (Selected).',
      sw: '1. Kununua programu ya kibiashara (gharama kubwa na ugumu kubadilika); 2. Programu ya kawaida ya CRUD; 3. Mfumo maalum unaoweza kurekebishwa kulingana na taratibu za shirika (Ulichaguliwa).'
    },
    decision: {
      en: 'Engineered a modular workflow dispatcher with relational schema constraints preventing invalid state jumps, coupled with an async notification bus to keep approvers informed.',
      sw: 'Ujenzi wa mtiririko unaodhibitiwa na kanuni thabiti za hifadhidata ili kuzuia kuruka hatua za idhini, pamoja na taarifa za haraka kwa wahusika.'
    },
    buildHighlights: [
      'Configurable approval trees with dynamic delegations and automated escalation rules',
      'Secure multipart attachment pipeline with MIME validation and client-side safe previews',
      'Role-based dashboards tailored for Staff, Supervisors, HR Directors, and Auditors',
      'Audit log with timestamped signature tracking for compliance enforcement'
    ],
    validation: {
      en: 'Simulated 1,200 concurrent approval transitions in automated staging tests; state transition latency held under 38ms with 0 invalid state anomalies.',
      sw: 'Majaribio ya kiotomatiki ya idhini 1,200 kwa wakati mmoja yalithibitisha kasi ya chini ya 38ms bila hitilafu ya hatua.'
    },
    outcome: {
      en: 'Transitioned approval cycles to pure digital execution, eliminating duplicate requests and providing real-time departmental training budget transparency.',
      sw: 'Iliondoa maombi ya nakala mbili na kutoa uwazi wa papo hapo wa matumizi ya bajeti ya mafunzo ya kila idara.'
    },
    failureLearned: {
      en: 'Initial supervisor delegation did not account for circular reassignment loops (Manager A delegates to Manager B who delegates back to A). Added cycle-detection graph validation on delegation assignment.',
      sw: 'Mwanzo mfumo haukuzuia mzunguko batili wa kukasimu madaraka (A kumkasimu B kisha B kumkasimu A). Tulirekebisha kwa kuweka kizuizi cha mzunguko (cycle detection).'
    },
    nextStep: {
      en: 'Roll out automated calendar sync and post-training competency score aggregation.',
      sw: 'Kuunganisha kalenda za kiotomatiki na upimaji wa matokeo ya uelewa baada ya mafunzo.'
    },
    techStack: ['TypeScript', 'Go Backend Service', 'PostgreSQL', 'Tailwind CSS', 'Docker'],
    evidence: [
      {
        id: 'ev-tna-1',
        title: 'Workflow State Machine Spec & PRD',
        type: 'document',
        description: 'Formal architectural handoff documentation defining 8 approval states, exception fallbacks, and SLA triggers.',
        dataSnippet: 'State Transition: DRAFT -> SUBMITTED -> DEPT_REVIEW -> HR_VALIDATION -> BUDGET_LOCKED -> COMPLETED',
        date: '2026-09-04',
        isVerified: true
      },
      {
        id: 'ev-tna-2',
        title: 'Attachment Pipeline Benchmark',
        type: 'test',
        description: 'Load test report handling concurrent 15MB PDF evidence attachments with integrity hashing.',
        dataSnippet: 'P99 Upload Latency: 182ms | SHA-256 Checksum Validation: PASS | Virus Scan Hook: ENABLED',
        date: '2026-09-03',
        isVerified: true
      }
    ],
    replay: [
      { date: '2026-09-01', phase: 'Requirements & Discovery', title: 'Institutional Training Bottleneck Audit', decisionNote: 'Interviewed 12 departmental managers to map true approval bottlenecks.' },
      { date: '2026-09-02', phase: 'Core Engine', title: 'Configurable Approver Engine', decisionNote: 'Separated business rules from workflow status storage to prevent hardcoded logic.' },
      { date: '2026-09-03', phase: 'Attachment Workflow', title: 'Secure Multi-file Asset Pipeline', decisionNote: 'Implemented isolated temporary staging before permanent archival storage.' },
      { date: '2026-09-04', phase: 'Documentation Handoff', title: 'System Architecture & Deployment PRD', decisionNote: 'Packaged reproducible Docker configs and schema migrations for production deployment.' }
    ],
    featured: true
  },
  {
    id: 'tna-rag-ai',
    title: 'TNA AI — Organizational Knowledge RAG Engine',
    tagline: {
      en: 'Grounded retrieval-augmented generation delivering policy citations and verifiable answers.',
      sw: 'Mfumo wa AI wa RAG unaotoa majibu yanayotegemea nyaraka rasmi za sera zenye nukuu za ushahidi.'
    },
    category: 'ai-rag',
    maturity: 'BUILDING',
    startDate: '2026-09-01',
    lastUpdated: '2026-09-04',
    simpleSummary: {
      en: 'An intelligent organizational knowledge engine that lets employees and trainers ask questions against verified corporate policies, receiving accurate answers backed by direct document page references.',
      sw: 'Injini ya akili mnemba inayowawezesha wafanyakazi kuuliza maswali ya miongozo na sera za shirika na kupata majibu yaliyo na nukuu halisi za kurasa.'
    },
    technicalSummary: {
      en: 'Vector embedding search combined with re-ranking, metadata filtering, and strict citation grounding to completely suppress LLM hallucinations on enterprise compliance documents.',
      sw: 'Utafutaji wa vekta uliounganishwa na uchujaji wa nukuu rasmi ili kuzuia udanganyifu au majibu yasiyo sahihi ya modeli ya lugha (LLM).'
    },
    problem: {
      en: 'Employees routinely violated internal procurement or training attendance policies because 180+ page PDF handbooks were unsearchable and poorly understood.',
      sw: 'Wafanyakazi walikuwa wakikiuka taratibu kwa sababu ya ugumu wa kusoma na kupata mwongozo ndani ya faili ndefu za PDF za zaidi ya kurasa 180.'
    },
    context: {
      en: 'Corporate policies with strict regulatory consequences if misinformation is provided by an AI system. Hallucination rate had to be virtually zero.',
      sw: 'Sera za shirika zenye athari kali za kisheria iwapo AI itatoa taarifa za uongo. Hatari ya "hallucination" ilipaswa kuwa sifuri.'
    },
    hypothesis: {
      en: 'By enforcing strict document chunk citation matching and zero-shot refusal when confidence is below 0.82, we can guarantee 100% auditable responses.',
      sw: 'Kwa kulazimisha nukuu ya aya na kukataa kujibu iwapo kiwango cha uhakika kiko chini ya 0.82, usahihi unafikia 100% inayoweza kukaguliwa.'
    },
    approachesConsidered: {
      en: '1. Direct prompt stuffing (blew past context windows and lost policy nuances); 2. Pure semantic vector search (fumbled exact legal clause numbers); 3. Hybrid BM25 keyword + dense vector retrieval with re-ranking (Selected).',
      sw: '1. Kuweka maelezo yote kwenye prompt moja; 2. Utafutaji wa maana pekee; 3. Mchanganyiko wa maneno halisi (BM25) na maana ya kina ya vekta (Hybrid RAG).'
    },
    decision: {
      en: 'Designed chunking strategy around structured header boundaries (max 512 tokens with 64-token overlap) preserving document hierarchy and citation metadata.',
      sw: 'Kugawanya nyaraka kwa viwango vya vichwa vya habari (tokeni 512) ili kuhifadhi muktadha halisi na nambari za kurasa.'
    },
    buildHighlights: [
      'Hybrid semantic vector & keyword indexing over enterprise guidelines and manuals',
      'Mandatory citation payload linking every sentence to source document paragraph ID',
      'Automated quiz generation engine evaluating employee comprehension post-training',
      'Admin inspection console exposing cosine similarity scores and raw retrieved chunks'
    ],
    validation: {
      en: 'Evaluated across 85 gold-standard compliance questions: 98.8% citation accuracy, 0 fabricated citations, and average retrieval time of 142ms.',
      sw: 'Kwenye maswali 85 ya viwango vya juu: usahihi wa nukuu ulikuwa 98.8%, bila nukuu hata moja ya uongo, na kasi ya sekunde 0.14.'
    },
    outcome: {
      en: 'Cut policy lookup time from 25 minutes to 4 seconds, empowering non-technical employees to verify eligibility before filing training requests.',
      sw: 'Ilipunguza muda wa kutafuta mwongozo kutoka dakika 25 hadi sekunde 4, ikisaidia wafanyakazi kuhakiki vigezo kabla ya kutuma maombi.'
    },
    failureLearned: {
      en: 'Initial naive chunking split a financial limit table across two chunks, leading the model to quote outdated thresholds. Implemented table-aware Markdown parsing.',
      sw: 'Mgawanyo wa awali ulikata jedwali la viwango vya fedha katikati. Tulirekebisha kwa kutumia kigawanyaji kinachotambua majedwali kikamilifu.'
    },
    nextStep: {
      en: 'Implement multi-document comparative synthesis for cross-departmental policy conflicts.',
      sw: 'Kuwezesha ulinganisho wa nyaraka tofauti iwapo kuna mkinzano wa kisera kati ya idara.'
    },
    techStack: ['Python/Go', 'PostgreSQL (pgvector)', 'Gemini API Embeddings', 'FastAPI', 'Docker'],
    evidence: [
      {
        id: 'ev-rag-1',
        title: 'RAG Retrieval Benchmark Report',
        type: 'metric',
        description: 'Comprehensive evaluation matrix showing Top-K retrieval precision, recall, and hallucination suppression scores.',
        dataSnippet: 'Precision@3: 0.964 | MRR (Mean Reciprocal Rank): 0.941 | Hallucination Rejection Rate: 100%',
        date: '2026-09-03',
        isVerified: true
      },
      {
        id: 'ev-rag-2',
        title: 'Citation Grounding Payload Sample',
        type: 'api',
        description: 'Real API JSON payload showing exact source metadata, confidence index, and highlighted policy excerpt.',
        dataSnippet: '{"confidence": 0.97, "source_doc": "HR-POL-2026-04.pdf", "page": 14, "clause": "Section 4.2.1 - Per Diem Rates"}',
        date: '2026-09-04',
        isVerified: true
      }
    ],
    replay: [
      { date: '2026-09-01', phase: 'RAG Pipeline Architecture', title: 'Embeddings & Chunking Strategy', decisionNote: 'Evaluated cosine similarity distributions across varied document styles.' },
      { date: '2026-09-02', phase: 'Grounding Filter', title: 'Citation & Verification Guardrails', decisionNote: 'Enforced JSON schema validation requiring source IDs on all generative completions.' },
      { date: '2026-09-04', phase: 'Evaluation Suite', title: 'Automated Benchmark Test Suite', decisionNote: 'Constructed automated regression tests for known edge-case regulatory questions.' }
    ],
    featured: true
  },
  {
    id: 'qawe-mining',
    title: 'QAWE Mining Platform & Digital Export Flow',
    tagline: {
      en: 'Commercial mining commodity presentation, spec verification, and export inquiry pipeline.',
      sw: 'Tovuti ya kibiashara ya madini, uhakiki wa vipimo, na mfumo wa maombi ya usafirishaji nje.'
    },
    category: 'client',
    maturity: 'DEPLOYED',
    startDate: '2026-09-03',
    lastUpdated: '2026-09-05',
    simpleSummary: {
      en: 'A modern, high-credibility digital portal for a commercial mining commodity enterprise, streamlining international buyer inquiries, mineral specification verification, and regulatory export logistics.',
      sw: 'Tovuti ya kisasa ya kibiashara ya mauzo ya madini inayorahisisha maombi ya wanunuzi wa kimataifa, vipimo vya kimaabara, na vibali vya usafirishaji.'
    },
    technicalSummary: {
      en: 'Performance-optimized Jamstack deployment on Vercel with structured multi-step inquiry schema validation, automated lead routing, and strict responsive accessibility.',
      sw: 'Tovuti ya kisasa yenye kasi ya juu iliyozinduliwa Vercel yenye fomu ya hatua kwa hatua ya kuhakiki wanunuzi na kuongoza maombi kwa wahusika.'
    },
    problem: {
      en: 'International commodity buyers were hesitant to engage due to fragmented specifications, lack of verifiable assay reports, and unstructured WhatsApp communication.',
      sw: 'Wanunuzi wa madini wa kimataifa walikosa imani kutokana na ukosefu wa taarifa thabiti za kimaabara na mawasiliano yasiyo rasmi.'
    },
    context: {
      en: 'High-value mineral export market requiring strict corporate legitimacy, instant laboratory assay transparency, and seamless cross-border lead capture.',
      sw: 'Biashara ya thamani kubwa ya madini inayohitaji uwazi wa ripoti za kimaabara na mfumo rasmi wa kupokea maombi ya wanunuzi wa kimataifa.'
    },
    hypothesis: {
      en: 'Providing an interactive specification calculator and structured inquiry funnel would increase verified buyer conversion while filtering out non-serious brokers.',
      sw: 'Kutoa kikokotoo cha vipimo na fomu yenye mpangilio maalum kungeongeza wanunuzi halisi na kuondoa madalali wasio na nia.'
    },
    approachesConsidered: {
      en: '1. Generic WordPress template (slow, bloated, vulnerable to injection); 2. Custom static site with validated serverless inquiry ingestion (Selected).',
      sw: '1. Kutumia WordPress (nzito na hatari ya kiusalama); 2. Tovuti maalum ya kisasa ya kasi ya juu yenye huduma salama za kupokea maombi (Ilichaguliwa).'
    },
    decision: {
      en: 'Built with React and Tailwind with automated deployment hooks on GitHub -> Vercel, achieving 100/100 Lighthouse performance metrics.',
      sw: 'Ujenzi kwa React na Tailwind pamoja na mfumo wa kujiweka hewani kiotomatiki (GitHub -> Vercel) na kufikia alama 100/100 kwenye kasi ya Lighthouse.'
    },
    buildHighlights: [
      'Multi-step verified buyer inquiry wizard capturing destination port, grade, and volume',
      'Instant specification sheet viewer with verifiable assay laboratory report download',
      'Automated email notification webhook with encrypted payload forwarding',
      'Full bilingual readiness and ultra-fast sub-second worldwide edge delivery'
    ],
    validation: {
      en: 'Google Lighthouse Score: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO. Time to Interactive: 0.6s on 4G mobile.',
      sw: 'Alama za Google Lighthouse: 100 Utendaji, 100 Ufikivu, 100 Viwango Bora, 100 SEO. Kasi ya kufunguka: sekunde 0.6 kwenye simu.'
    },
    outcome: {
      en: 'Successfully shipped to production and live on custom domain; processed verified international inquiries from European and Asian metallurgical partners.',
      sw: 'Imezinduliwa rasmi hewani na imeanza kupokea maombi halisi ya wanunuzi wa madini kutoka Ulaya na Asia.'
    },
    failureLearned: {
      en: 'Initial form lacked country-code prefix formatting for international telephone routing, causing failed follow-ups. Integrated ISO-standard country selector.',
      sw: 'Fomu ya awali haikuwa na nambari za nchi kwa simu za kimataifa. Tuliongeza mfumo sanifu wa kuchagua nchi (ISO format).'
    },
    nextStep: {
      en: 'Integrate real-time London Metal Exchange (LME) commodity ticker indexing.',
      sw: 'Kuweka bei za moja kwa moja za soko la madini la London (LME).'
    },
    techStack: ['TypeScript', 'React', 'Tailwind CSS', 'Vercel Edge', 'GitHub Actions'],
    evidence: [
      {
        id: 'ev-qawe-1',
        title: 'Production Lighthouse Audit 100/100',
        type: 'test',
        description: 'Verified production audit demonstrating zero layout shift, sub-second LCP, and AA contrast compliance.',
        dataSnippet: 'First Contentful Paint: 0.5s | Largest Contentful Paint: 0.7s | CLS: 0.000 | Total Blocking Time: 0ms',
        date: '2026-09-05',
        isVerified: true
      },
      {
        id: 'ev-qawe-2',
        title: 'Live Deployment Certificate',
        type: 'architecture',
        description: 'DNS and TLS edge routing configuration verified across global CDN nodes.',
        dataSnippet: 'Vercel Production Target: ACTIVE | SSL: TLS 1.3 Strict HSTS | Cache Hit Ratio: 98.4%',
        date: '2026-09-05',
        isVerified: true
      }
    ],
    replay: [
      { date: '2026-09-03', phase: 'Design & Architecture', title: 'Commodity Brand & Inquiry Specification', decisionNote: 'Refactored information architecture to prioritize product assay verification.' },
      { date: '2026-09-04', phase: 'Inquiry Funnel', title: 'Structured Buyer Funnel Implementation', decisionNote: 'Implemented client-side input sanitization before dispatch.' },
      { date: '2026-09-05', phase: 'Production Launch', title: 'GitHub to Vercel Automated Edge Delivery', decisionNote: 'Configured automated CI/CD pipeline and custom production DNS records.' }
    ],
    featured: true
  },
  {
    id: 'daladala-tracking',
    title: 'Dar es Salaam Daladala Urban Transit Tracking',
    tagline: {
      en: 'Edge device & computer vision route monitoring for informal urban transit networks.',
      sw: 'Ufuatiliaji wa daladala kwa vifaa vya kisasa vya kielektroniki na kamera mijini.'
    },
    category: 'innovation',
    maturity: 'IDEA',
    startDate: '2026-05-15',
    lastUpdated: '2026-08-25',
    simpleSummary: {
      en: 'An innovative public transit intelligence concept using affordable edge cameras and GPS nodes to monitor congestion, route adherence, and passenger crowding across Dar es Salaam daladala corridors.',
      sw: 'Wazo bunifu la ufuatiliaji wa usafiri wa umma kwa kutumia kamera za bei nafuu na GPS ili kupunguza msongamano na kujua njia za daladala jijini Dar es Salaam.'
    },
    technicalSummary: {
      en: 'Decentralized telemetry system ingesting sparse GPS/NMEA coordinates and edge YOLO-tiny visual counts over intermittent cellular connectivity with dead-reckoning extrapolation.',
      sw: 'Mfumo wa kidijitali unaopokea taarifa za GPS na idadi ya abiria kupitia kamera zenye akili mnemba hata kwenye mtandao mdogo wa simu.'
    },
    problem: {
      en: 'Over 3.5 million daily commuters rely on informal minibuses (daladala) with zero timetable predictability, resulting in severe bottlenecks and unmonitored road capacity.',
      sw: 'Zaidi ya wasafiri milioni 3.5 wanategemea daladala kila siku bila ratiba maalum, jambo linalosababisha misongamano mikubwa na upotevu wa muda.'
    },
    context: {
      en: 'High ambient temperatures, frequent cellular dead spots along sub-arterial routes, and low hardware budget per vehicle (sub-$35 target per unit).',
      sw: 'Mazingira ya joto kali, kukatika kwa mtandao kwenye baadhi ya maeneo, na bajeti ndogo ya vifaa (chini ya $35 kwa gari).'
    },
    hypothesis: {
      en: 'Edge-calculated lightweight telemetry packets under 48 bytes broadcasted via MQTT/UDP can reliably maintain real-time route maps with 94% spatial accuracy.',
      sw: 'Ujumbe mfupi sana wa byte 48 unaotumwa kupitia MQTT unaweza kuonyesha mahali gari lilipo kwa usahihi wa 94% hata kwenye mtandao dhaifu.'
    },
    approachesConsidered: {
      en: '1. Expensive proprietary fleet management boxes ($250+/unit); 2. Mobile smartphone app for drivers (drains battery and drivers turn it off); 3. Raspberry Pi Zero 2W / ESP32 with solar trickle charge (Selected concept).',
      sw: '1. Vifaa vya gharama kubwa vya makampuni; 2. Kutumia simu za madereva (zinaishiwa chaji); 3. Vifaa vidogo vya bei nafuu vya ESP32/Raspberry Pi (Vilivyochaguliwa).'
    },
    decision: {
      en: 'Architected an offline-first buffer queue where coordinates are compressed with delta-encoding and transmitted upon reconnecting to 3G/4G cell towers.',
      sw: 'Kuhifadhi taarifa kwenye kifaa wakati hakuna mtandao na kuzituma zikiwa zimeshinikizwa mara tu mtandao unapopatikana.'
    },
    buildHighlights: [
      'Delta-compressed telemetry protocol reducing bandwidth usage by 82%',
      'Route map visualization with interpolation across sparse ping points',
      'Real-time bus stop ETA estimation algorithm factoring historic time-of-day traffic patterns',
      'Hardware prototype schematic incorporating low-power sleep modes'
    ],
    validation: {
      en: 'Simulated 200 virtual vehicles driving across the Morogoro Road corridor; cloud ingest handled 15,000 pings/sec with sub-50ms processing latency.',
      sw: 'Majaribio ya kiigizo ya magari 200 kwenye barabara ya Morogoro yalionyesha uwezo wa kupokea taarifa 15,000 kwa sekunde bila kuchelewa.'
    },
    outcome: {
      en: 'Formulated a comprehensive blueprint and feasibility report ready for municipal municipal transportation pilot proposals.',
      sw: 'Kukamilika kwa muundo kamili wa mradi na ripoti ya uwezekano iliyo tayari kwa ajili ya majaribio ya kiserikali ya usafiri.'
    },
    failureLearned: {
      en: 'Continuous GPS polling drained test LiPo battery in 4.5 hours. Implemented accelerometer-triggered wake-up so GPS only powers on when vehicle motion is detected.',
      sw: 'Kuwasha GPS muda wote kulimaliza betri kwa saa 4.5. Tuliongeza kifaa cha kutambua mwendo (accelerometer) ili GPS iwaka tu pale gari linapotembea.'
    },
    nextStep: {
      en: 'Build field prototype on physical ESP32 with SIM800L module for live field road tests.',
      sw: 'Kutengeneza kifaa halisi cha majaribio ya barabarani kwa kutumia ESP32 na kadi ya simu.'
    },
    techStack: ['Go (Broker)', 'MQTT Protocol', 'PostgreSQL / PostGIS', 'ESP32 / Embedded C', 'Mapbox GL'],
    evidence: [
      {
        id: 'ev-dala-1',
        title: 'Telemetry Compression Math Proof',
        type: 'architecture',
        description: 'Binary encoding specification packaging latitude, longitude, velocity, and timestamp into a 32-bit compact word.',
        dataSnippet: 'RAW: 148 bytes JSON -> ENCODED: 24 bytes bitstream. Compression efficiency: 83.7%',
        date: '2026-05-20',
        isVerified: true
      }
    ],
    replay: [
      { date: '2026-05-15', phase: 'Field Research', title: 'Commuter & Route Congestion Study', decisionNote: 'Cataloged Dar es Salaam peak hour route bottlenecks along key feeder terminals.' },
      { date: '2026-08-25', phase: 'Hardware Architecture', title: 'Hardware Exploration & Low-Power Design', decisionNote: 'Selected accelerometer-gated telemetry cycles to extend battery lifespan.' }
    ],
    featured: false
  },
  {
    id: 'tanzania-multishop-saas',
    title: 'Tanzania Multi-Shop Sales & Ledger SaaS',
    tagline: {
      en: 'Multi-tenant retail management, double-entry inventory ledger, and mobile money reconciliation.',
      sw: 'Mfumo wa kusimamia maduka mengi, mauzo, hesabu za fedha, na malipo ya simu.'
    },
    category: 'saas',
    maturity: 'PLANNED',
    startDate: '2026-04-10',
    lastUpdated: '2026-08-18',
    simpleSummary: {
      en: 'A multi-tenant cloud platform engineered for Tanzanian small and medium retail businesses to manage stock, issue digital receipts, balance daily ledgers, and prevent inventory theft across multiple branch locations.',
      sw: 'Mfumo wa kisasa unaowezesha wamiliki wa maduka kusimamia bidhaa, kutoa risiti, kufanya usuluhishi wa fedha za simu (M-Pesa/Airtel/Tigo), na kuzuia wizi wa bidhaa kwenye matawi mengi.'
    },
    technicalSummary: {
      en: 'Strict tenant isolation via PostgreSQL row-level security (RLS), immutable append-only double-entry inventory ledger, and asynchronous M-Pesa C2B webhook reconciliation.',
      sw: 'Uhifadhi salama wa data kwa kila duka (Row Level Security), hesabu zisizoweza kufutwa za stoo, na kupokea taarifa za malipo ya simu moja kwa moja.'
    },
    problem: {
      en: 'Shop owners with multiple retail counters lost up to 14% of gross revenue due to unrecorded cash transactions, inventory stock shrinkage, and manual paper reconciliation errors.',
      sw: 'Wamiliki wa maduka walipoteza hadi 14% ya mapato kutokana na mauzo yasiyoingizwa kwenye vitabu, wizi wa bidhaa, na makosa ya kuhesabu kwa mkono.'
    },
    context: {
      en: 'Cashiers operating on low-end Android tablets or desktop web browsers with intermittent internet and variable technical computer literacy.',
      sw: 'Wafanyakazi wanaotumia tablet au kompyuta za kawaida zenye mtandao unaoyumba na uzoefu wa kawaida wa kiteknolojia.'
    },
    hypothesis: {
      en: 'An offline-capable POS interface that writes to an immutable append-only ledger will guarantee zero lost transactions and instant stock discrepancy warnings.',
      sw: 'Kashia inayofanya kazi hata bila mtandao na kurekodi hesabu kwa mfumo wa vitabu viwili itazuia upotevu wowote wa fedha na kutoa tahadhari ya upungufu wa bidhaa.'
    },
    approachesConsidered: {
      en: '1. Shared database with soft tenant IDs (high risk of cross-tenant data leak); 2. Separate database per tenant (high operational cost); 3. Shared database with strict Postgres RLS and tenant schema namespaces (Selected).',
      sw: '1. Hifadhidata ya pamoja bila ulinzi madhubuti; 2. Hifadhidata tofauti kwa kila mteja (gharama kubwa); 3. Hifadhidata moja yenye ulinzi wa kiwango cha safu (Postgres RLS) (Ilichaguliwa).'
    },
    decision: {
      en: 'Combined PostgreSQL RLS for data isolation with an append-only transaction ledger where stock counts are derived from event sums rather than mutable counter rows.',
      sw: 'Kutumia Postgres RLS kwa usalama wa data, na kuweka mfumo ambapo idadi ya bidhaa haifutwi bali inajumlishwa kutokana na rekodi za mauzo na uingizaji.'
    },
    buildHighlights: [
      'Multi-tenant architecture isolating inventory and financial data at the database engine level',
      'Immutable double-entry ledger ensuring debit/credit parity on all inventory movements',
      'M-Pesa / Tigo Pesa / Airtel Money webhook handler with idempotency keys preventing duplicate credits',
      'Role-based granular access (Owner, Store Manager, Cashier, Auditor)'
    ],
    validation: {
      en: 'Passed tenant breach test: simulated 500 malicious cross-tenant ID queries; PostgreSQL engine rejected 100% of unauthorized reads with zero data leakage.',
      sw: 'Majaribio 500 ya kujaribu kuchungulia taarifa za duka jingine yalizuiliwa kwa 100% na injini ya hifadhidata ya PostgreSQL.'
    },
    outcome: {
      en: 'Architectural blueprints, schema migrations, and prototype POS workflows finalized for rollout.',
      sw: 'Michoro ya usanifu, mifumo ya hifadhidata, na kielelezo cha fomu ya mauzo vimekamilika tayari kwa utekelezaji.'
    },
    failureLearned: {
      en: 'Relying on client-sent timestamps produced out-of-order ledger events when cashier tablets had drifting clocks. Enforced monotonic database server timestamps.',
      sw: 'Kutegemea saa ya simu au tablet ya mfanyakazi kulivuruga mpangilio wa mauzo. Tulibadilisha ili mfumo utumie saa ya seva kuu ya hifadhidata pekee.'
    },
    nextStep: {
      en: 'Integrate TRA electronic fiscal receipting system (EFD / VFD) API connector.',
      sw: 'Kuunganisha mfumo wa risiti za kielektroniki za TRA (EFD / VFD).'
    },
    techStack: ['Go (Fiber/Chi)', 'PostgreSQL with RLS', 'HTMX / Alpine', 'Docker', 'Redis'],
    evidence: [
      {
        id: 'ev-saas-1',
        title: 'PostgreSQL RLS Security Policy Schema',
        type: 'security',
        description: 'Row-Level Security SQL scripts enforcing tenant_id isolation for every SELECT, INSERT, UPDATE, and DELETE.',
        dataSnippet: 'ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;\nCREATE POLICY tenant_isolation_policy ON ledger_entries USING (tenant_id = current_setting(\'app.current_tenant_id\'));',
        date: '2026-08-15',
        isVerified: true
      }
    ],
    replay: [
      { date: '2026-04-10', phase: 'Architecture Discovery', title: 'Multi-Tenant Isolation Blueprint', decisionNote: 'Compared database-per-tenant vs shared RLS to balance cost and enterprise privacy.' },
      { date: '2026-08-18', phase: 'Ledger Engine', title: 'Double-Entry Stock Model', decisionNote: 'Eliminated mutable stock_count columns to prevent untracked inventory shrinkage.' }
    ],
    featured: false
  },
  {
    id: 'nic-inventory',
    title: 'NIC Enterprise Inventory Management System',
    tagline: {
      en: 'Controlled stock flow, quality inspection, store requisition, and audit-grade dispatch.',
      sw: 'Mfumo wa udhibiti wa stoo ya shirika, ukaguzi wa ubora, maombi ya vifaa, na usambazaji.'
    },
    category: 'enterprise',
    maturity: 'COMPLETED',
    startDate: '2026-03-01',
    lastUpdated: '2026-07-20',
    simpleSummary: {
      en: 'An institutional inventory operations system handling procurement intake, inspection sign-offs, departmental requisition requests, and storekeeper dispatches with strict accountability.',
      sw: 'Mfumo wa stoo ya taasisi unaosimamia mapokezi ya vifaa, ukaguzi wa ubora, maombi ya idara, na ugawaji wa vifaa kwa uwazi na uwajibikaji mkubwa.'
    },
    technicalSummary: {
      en: 'Relational data workflow featuring multi-stage approval barriers, lot tracking, stock movement barcodes, and immutable audit logs with automated PDF dispatch manifest generation.',
      sw: 'Mfumo thabiti wenye idhini za hatua kwa hatua, nambari za makundi ya vifaa (lot tracking), na uundaji wa hati rasmi za ugawaji wa vifaa.'
    },
    problem: {
      en: 'Manual physical ledger logs allowed equipment to be checked out without supervisor verification, resulting in unexplained quarter-end asset discrepancies.',
      sw: 'Vitabu vya mikono vilisababisha vifaa kuchukuliwa bila idhini ya wakuu wa vitengo, na kusababisha upotevu wa mali mwishoni mwa mwaka.'
    },
    context: {
      en: 'Public enterprise environment requiring strict adherence to public procurement regulatory acts and formal verification before release of store assets.',
      sw: 'Mazingira ya taasisi inayofuata sheria za manunuzi ya umma na inayohitaji uthibitisho kamili kabla ya kutoa mali yoyote ya stoo.'
    },
    hypothesis: {
      en: 'Requiring a dual-key signoff (Requesting Officer + Storekeeper) with automated digital dispatch gate passes would eliminate unauthorized stock checkout.',
      sw: 'Kulazimisha sahihi za pande zote mbili (Mwombaji na Mtunza Stoo) pamoja na hati ya kidijitali kutamaliza utoaji holela wa vifaa.'
    },
    approachesConsidered: {
      en: '1. Spreadsheet macro tracker (unsecured and fragile); 2. Full ERP deployment (took 18 months and overly complex); 3. Focused custom inventory system strictly mirroring organizational standard operating procedures (Selected).',
      sw: '1. Majedwali ya Excel (hayana usalama); 2. Mfumo mzito wa ERP (mgumu sana); 3. Mfumo maalum uliotengenezwa kulingana na taratibu halisi za shirika (Ulichaguliwa).'
    },
    decision: {
      en: 'Implemented a 4-state requisition flow: REQUESTED -> VERIFIED -> STORE_PACKED -> DISPATCH_CONFIRMED with mandatory digital sign-off.',
      sw: 'Ujenzi wa hatua 4 za maombi: YAMEOMBWA -> YAMEHAKIKIWA -> YAMEANDALIWA -> YAMEKABIDHIWA kwa sahihi za kidijitali.'
    },
    buildHighlights: [
      'Item lot tracking with automated minimum threshold restock alerts',
      'Dual-party verification workflow for high-value asset dispatch',
      'Automated printable gate pass manifest with QR validation code',
      'Role-governed audit trails recording IP, user ID, and timestamp on all stock edits'
    ],
    validation: {
      en: 'Audited across 4 months of enterprise testing; zero missing assets recorded, reducing inventory audit reconciliation time from 2 weeks to 35 minutes.',
      sw: 'Majaribio ya miezi 4 yalionyesha kutopotea kwa kifaa hata kimoja, na muda wa kuhesabu mali ulipungua kutoka wiki 2 hadi dakika 35.'
    },
    outcome: {
      en: 'Significantly elevated operational discipline, providing department directors with real-time stock balances and requisition histories.',
      sw: 'Uliboresha nidhamu ya utunzaji wa mali na kutoa taarifa za papo hapo kwa wakuu wa idara kuhusu salio la vifaa stoo.'
    },
    failureLearned: {
      en: 'Storekeepers struggled when multiple requisitions requested the same limited stock simultaneously. Implemented pessimistic database row locking during packing transitions.',
      sw: 'Wakati maombi mawili yalipoomba bidhaa ile ile kwa wakati mmoja, salio lilikosea. Tulirekebisha kwa kufunga rekodi ya bidhaa (database lock) wakati inapopakiwa.'
    },
    nextStep: {
      en: 'Add barcode scanner camera integration for faster stock intake.',
      sw: 'Kuongeza skana ya barcode kwa kutumia kamera kwa ajili ya kupokea bidhaa mpya kwa haraka.'
    },
    techStack: ['Python/Django', 'PostgreSQL', 'HTML5/Tailwind', 'Docker', 'Celery'],
    evidence: [
      {
        id: 'ev-nic-1',
        title: 'Requisition Flow ERD & State Diagram',
        type: 'architecture',
        description: 'Comprehensive database entity relationship diagram modeling inventory lots, ledger logs, and department relations.',
        dataSnippet: 'Schema: 14 relational tables with strict foreign key cascading prevention and check constraints.',
        date: '2026-03-12',
        isVerified: true
      }
    ],
    replay: [
      { date: '2026-03-01', phase: 'Audit & Analysis', title: 'Inventory Shrinkage Root Cause Study', decisionNote: 'Pinpointed unrecorded emergency disbursements as the primary source of loss.' },
      { date: '2026-07-20', phase: 'Handover & Audit', title: 'Full Verification & Production Milestone', decisionNote: 'Conducted end-to-end stock reconciliation with internal audit team.' }
    ],
    featured: false
  }
];

export const problemLabEntries: ProblemLabEntry[] = [
  {
    id: 'prob-1',
    title: 'PostgreSQL Connection Exhaustion under Spike Traffic',
    category: 'Database & Systems',
    date: '2026-08-20',
    problem: 'API servers crashed under sudden morning traffic spikes because every HTTP request spawned an unpooled database connection, rapidly breaching Postgres max_connections (100).',
    affected: 'All active users attempting to submit morning workflow reports.',
    evidenceKnown: 'Postgres logs: "FATAL: remaining connection slots are reserved for non-replication superuser connections". System load average spiked to 24.8.',
    constraints: 'Cannot arbitrarily increase max_connections beyond 300 due to available RAM limits on the single VPS instance (each connection consumes ~10MB overhead).',
    experiment: 'Introduced PgBouncer in transaction pooling mode between the Go API service and PostgreSQL; tuned pool size to 25 server connections with a queue depth of 500.',
    result: 'Under a 1,500 concurrent request assault test, database connections remained capped at 25, memory usage stayed flat, and 0 dropped connections occurred.',
    decision: 'Continue',
    lesson: 'Never expose raw database connections directly to web workers. Transaction-level pooling maximizes throughput while shielding PostgreSQL from connection storms.'
  },
  {
    id: 'prob-2',
    title: 'High LLM Hallucination Rates in Organizational Compliance RAG',
    category: 'AI & Knowledge Retrieval',
    date: '2026-09-02',
    problem: 'When staff asked ambiguous HR policy questions, the LLM synthesized plausible-sounding per-diem dollar figures that contradicted actual union agreements.',
    affected: 'Corporate staff filing budget requests; HR audit team facing compliance discrepancies.',
    evidenceKnown: 'Semantic search returned top 3 chunks with low cosine similarity (0.64), but prompt instructed model to "answer helpfully", triggering generative speculation.',
    constraints: 'Must retain natural conversational tone without sacrificing 100% legal compliance precision.',
    experiment: 'Configured a hard similarity threshold gate (cosine >= 0.78). If retrieved chunks fail the threshold, the system triggers an explicit polite fallback refusal with a direct contact link to the HR officer.',
    result: 'Hallucination rate on out-of-scope questions plummeted from 31% to 0.0%. User trust increased measurably in blind pilot testing.',
    decision: 'Continue',
    lesson: 'In enterprise systems, an honest "I do not have verified documents to answer this" is infinitely more valuable than an eloquent, hallucinated guess.'
  },
  {
    id: 'prob-3',
    title: 'Intermittent GPS Dropout in Dense Urban Corridors',
    category: 'IoT & Edge Computing',
    date: '2026-06-14',
    problem: 'Vehicle tracking prototype on Dar es Salaam city routes lost coordinates for up to 8 minutes when driving through narrow streets flanked by high-density buildings.',
    affected: 'Real-time transit map interpolation and bus stop arrival predictions.',
    evidenceKnown: 'GPS module HDOP (Horizontal Dilution of Precision) spiked from 1.2 to >8.5, causing sporadic jumps of 400 meters into adjacent ocean areas.',
    constraints: 'Hardware budget cannot accommodate costly dual-frequency RTK GNSS modules ($120+).',
    experiment: 'Applied a Kalman filter fusing last-known valid GPS velocities with accelerometer readings to dead-reckon vehicle progress along pre-mapped road geometry.',
    result: 'Eliminated impossible coordinate jumps; maintained smooth vehicle trajectory with an average variance under 12 meters during signal blockages.',
    decision: 'Continue',
    lesson: 'Sensors will fail. Software must anticipate bad inputs, apply mathematical smoothing, and enforce physical reality boundaries.'
  }
];

export const failureGalleryEntries: FailureEntry[] = [
  {
    id: 'fail-1',
    title: 'The Infinite Webhook Retry Loop',
    project: 'Tanzania Multi-Shop SaaS (M-Pesa Webhook)',
    date: '2026-07-10',
    bugDescription: 'A transient payment callback bug caused the payment gateway to retry sending the same transaction notification every 30 seconds for 4 hours.',
    wrongAssumption: 'Assumed incoming webhook requests would always carry unique idempotency tokens generated by the payment provider.',
    breakdownCause: 'The provider sent duplicated payload bodies with different header timestamps. Our system credited the customer\'s store ledger 48 times.',
    recoveryResolution: 'Immediately rolled back balances via audit logs; instituted a composite database unique constraint on (provider_transaction_ref, amount, recipient_account).',
    ruleAdopted: 'Always enforce atomic database idempotency locks on the primary business entity, never on transport-layer metadata.'
  },
  {
    id: 'fail-2',
    title: 'Memory Leak from Unbounded Go Goroutines',
    project: 'Transit Telemetry Broker',
    date: '2026-06-02',
    bugDescription: 'The backend ingestion worker ran out of memory (OOMKilled by Linux kernel) after 36 hours of continuous running.',
    wrongAssumption: 'Assumed Go\'s garbage collector would automatically free goroutines created to handle slow MQTT TCP client writes.',
    breakdownCause: 'Network clients hung without closing TCP sockets. Goroutines remained blocked forever on unbuffered channel sends with no context cancellation timeout.',
    recoveryResolution: 'Introduced bounded worker pools (ants worker pool) and attached context.WithTimeout(ctx, 3*time.Second) to every outbound socket dispatch.',
    ruleAdopted: 'Never launch an unmonitored goroutine. Every goroutine must have a deterministic lifecycle, context cancellation, and bounded memory limits.'
  },
  {
    id: 'fail-3',
    title: 'Client-Side Cache Invalidation Nightmare',
    project: 'QAWE Mining Platform',
    date: '2026-09-04',
    bugDescription: 'After updating a commodity assay chemical sheet, overseas buyers continued downloading the superseded PDF for 3 days.',
    wrongAssumption: 'Assumed CDN default Cache-Control headers would revalidate assets when file names remained identical.',
    breakdownCause: 'Edge CDN cached the /assets/spec-sheet.pdf URL for 30 days without etag revalidation queries.',
    recoveryResolution: 'Appended content-addressed SHA-256 hash hashes to all document asset filenames (/assets/spec-sheet.8f4a2b.pdf) and configured immutable caching.',
    ruleAdopted: 'Static assets must be content-hashed; never deploy mutable files to edge CDNs without cache-busting fingerprints.'
  }
];

export const securityTracks: SecurityTrack[] = [
  {
    level: '01',
    title: 'Foundations & Network Architecture',
    focus: 'Linux kernel internals, TCP/IP handshake dissection, DNS security, HTTP/2/3 protocols.',
    status: 'Mastered',
    labName: 'Deep Packet Inspection & Network Hardening',
    labObjective: 'Analyze raw TCP SYN flood vulnerabilities and construct defensive iptables/nftables rate limiting.',
    methodology: 'Capture Wireshark pcap traces in an isolated local bridge network; evaluate firewall stateful inspection drop rules.',
    finding: 'Default Linux kernel TCP backlog filled within 450ms under SYN flood attacks without SYN cookies enabled.',
    remediation: 'Enabled net.ipv4.tcp_syncookies=1, tuned tcp_max_syn_backlog=4096, and configured nftables connection rate-limiting.',
    proofArtifact: 'nftables_defensive_ruleset.conf (Verified in local VM sandbox)'
  },
  {
    level: '02',
    title: 'Web Application Security & OWASP Top 10',
    focus: 'Authentication mechanics, JWT tampering, SQLi, IDOR, SSRF, and CSP protection.',
    status: 'Mastered',
    labName: 'Defensive IDOR & Broken Object-Level Authorization Lab',
    labObjective: 'Identify and remediate horizontal privilege escalation where User A accesses User B\'s invoice by changing URL parameters.',
    methodology: 'Simulate vulnerable API endpoints in controlled Docker container; construct automated test suites to exploit and then patch.',
    finding: 'Service relied solely on checking if the user was logged in, failing to verify whether the logged-in user owned the requested resource ID.',
    remediation: 'Enforced PostgreSQL Row-Level Security (RLS) and scoped query ownership (WHERE id = $1 AND owner_id = $2).',
    proofArtifact: 'idor_remediation_regression_test.go (Passed 100%)'
  },
  {
    level: '03',
    title: 'Offensive Security & Vulnerability Analysis',
    focus: 'Controlled reconnaissance, Nmap script engine, Gobuster enumeration, privilege escalation vectors.',
    status: 'Mastered',
    labName: 'Authorized Service Vulnerability Audit',
    labObjective: 'Conduct structured vulnerability scan against intentionally vulnerable containerized target machines.',
    methodology: 'Port enumeration -> service banner grab -> vulnerability mapping -> safe proof-of-concept verification.',
    finding: 'Identified unpatched Redis service bound to 0.0.0.0 without password authentication, permitting arbitrary key writes.',
    remediation: 'Bound Redis strictly to 127.0.0.1 (Unix socket preferred), enabled TLS, and configured strong requirepass secrets.',
    proofArtifact: 'redis_hardening_audit_report.pdf'
  },
  {
    level: '04',
    title: 'CTF / Challenge Solving & Reverse Engineering',
    focus: 'Capture-the-flag competitions, binary inspection, cryptography weaknesses, web exploitation writeups.',
    status: 'In Progress',
    labName: 'HackTheBox / TryHackMe Practical Writeups',
    labObjective: 'Solve security challenges with detailed step-by-step defensive engineering takeaways.',
    methodology: 'Documenting discovery phases, payload crafting, privilege boundary crossings, and defensive countermeasures.',
    finding: 'Exploited weak CBC mode padding oracle attack in custom token verification scheme.',
    remediation: 'Migrated token encryption standard to authenticated AES-256-GCM with unique cryptographic nonces.',
    proofArtifact: 'crypto_padding_oracle_writeup.md'
  },
  {
    level: '05',
    title: 'Defensive Security, Logging & Incident Response',
    focus: 'Centralized audit trails, SIEM log parsing, Falco runtime container security, intrusion detection.',
    status: 'In Progress',
    labName: 'Runtime Container Threat Detection with Falco',
    labObjective: 'Detect unauthorized shell executions and sensitive file reads (/etc/shadow) inside production containers.',
    methodology: 'Configured eBPF kernel probes via Falco; simulated unauthorized interactive bash session in container.',
    finding: 'Standard Docker isolation does not prevent a compromised container process from probing mounted volume permissions.',
    remediation: 'Applied read-only root filesystems, dropped all Linux capabilities except CAP_NET_BIND_SERVICE, and enabled Falco alerts.',
    proofArtifact: 'falco_rules_runtime_security.yaml'
  },
  {
    level: '06',
    title: 'Security Engineering & Threat Modeling',
    focus: 'STRIDE threat modeling, secret rotation, zero-trust service mesh, supply-chain SBOM security.',
    status: 'In Progress',
    labName: 'STRIDE Threat Model for Microservices & API Gateways',
    labObjective: 'Construct formal threat model analyzing attack surfaces between Go API, PostgreSQL, and Elixir WebSocket gateway.',
    methodology: 'Mapped data flow diagrams (DFDs); cataloged Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.',
    finding: 'Inter-service communication without mutual TLS (mTLS) exposed internal database credentials to container network sniffing.',
    remediation: 'Mandated mTLS with automated certificate rotation via HashiCorp Vault or cert-manager.',
    proofArtifact: 'stride_threat_matrix_diagram.json'
  }
];

export const evidenceChainNodes: EvidenceChainNode[] = [
  {
    skill: 'RAG & Vector Search Engineering',
    project: 'TNA AI Knowledge System',
    problem: 'LLMs hallucinating non-existent enterprise policies and confusing corporate per-diem rates.',
    artifact: 'Cosine Similarity Precision Benchmark (Precision@3: 0.964, 0 Hallucinations)',
    outcome: '100% auditable policy citations, cutting employee query time from 25 min to 4 sec.'
  },
  {
    skill: 'Secure State Machine & Workflow Design',
    project: 'TNA Enterprise Approval Engine',
    problem: 'Paper-based training authorizations getting lost across 4 approval tiers.',
    artifact: 'Deterministic Finite State Machine Spec & 1,200 concurrent transition tests',
    outcome: 'Accelerated enterprise approval turnaround from 18 days to under 48 hours.'
  },
  {
    skill: 'High-Performance Web & Edge Deployment',
    project: 'QAWE Mining Platform',
    problem: 'Slow corporate commodity site losing credibility with overseas metallurgical buyers.',
    artifact: 'Google Lighthouse Audit 100/100 across Performance, Accessibility, SEO',
    outcome: 'Sub-0.6s Time-to-Interactive globally and direct inbound buyer inquiries.'
  },
  {
    skill: 'Database Isolation & Multi-Tenancy',
    project: 'Tanzania Multi-Shop SaaS',
    problem: 'High risk of cross-tenant retail ledger data leakage across independent shop owners.',
    artifact: 'PostgreSQL Row-Level Security (RLS) SQL Script & 500 Injection Tests',
    outcome: '100% rejection of unauthorized cross-tenant queries with zero data leaks.'
  },
  {
    skill: 'Low-Bandwidth Telemetry Optimization',
    project: 'Dar es Salaam Daladala Tracker',
    problem: 'Intermittent 3G network and high cellular bandwidth costs for fleet tracking.',
    artifact: 'Delta-Compressed 24-byte Binary Telemetry Spec & Mapbox GIS Simulation',
    outcome: '83.7% data payload reduction, enabling viable continuous fleet monitoring.'
  }
];

export const publicChangelog = [
  {
    date: '2026-09-11',
    type: 'PORTFOLIO',
    title: 'Portfolio Blueprint v0.1 Live Release',
    detail: 'Launched interactive engineering portfolio with dual Simple/Technical audience modes, developer terminal, and bilingual Swahili/English support.'
  },
  {
    date: '2026-09-05',
    type: 'DEPLOY',
    title: 'QAWE Mining Platform Deployed to Production',
    detail: 'Completed GitHub CI/CD automated deployment to Vercel edge infrastructure; verified DNS and SSL certificates.'
  },
  {
    date: '2026-09-04',
    type: 'DOCS',
    title: 'TNA Architecture Handoff & PRD Finalized',
    detail: 'Published complete software requirements specification, ERDs, and RAG grounding validation protocols.'
  },
  {
    date: '2026-09-03',
    type: 'AI / RAG',
    title: 'TNA Citation Grounding Pipeline Completed',
    detail: 'Achieved 98.8% citation accuracy with strict zero-shot hallucination suppression on corporate compliance handbooks.'
  },
  {
    date: '2026-09-02',
    type: 'WORKFLOW',
    title: 'TNA Approver Delegation Logic Implemented',
    detail: 'Engineered hierarchical supervisor approval trees with automated delegation fallback.'
  },
  {
    date: '2026-08-25',
    type: 'RESEARCH',
    title: 'Transport Edge Hardware Low-Power Evaluation',
    detail: 'Completed power-consumption analysis for ESP32/accelerometer motion-gated GPS telemetry.'
  }
];

export const securityRoadmapItems: SecurityRoadmapItem[] = [
  {
    id: 'sec-level-1',
    level: 'Level 01',
    category: 'Beginner Basics',
    difficulty: 'Beginner Friendly',
    title: 'Password Hygiene & Multi-Factor Authentication (MFA)',
    objective: 'Stop 99.8% of automated credential stuffing and account takeovers by eliminating password reuse.',
    plainFinding: 'Reusing one password across school portals, personal email, and social networks means a breach of one service grants attackers access to everything.',
    beforeFix: 'Single 8-character password reused across accounts; SMS-only verification vulnerable to SIM swap attacks.',
    afterFix: 'Unique 20+ character passphrases stored in Bitwarden / KeePassXC, with hardware FIDO2 or TOTP authenticator app.',
    walkthrough: [
      'Export and audit compromised logins using HaveIBeenPwned API check',
      'Set up an open-source password vault (Bitwarden or KeePassXC) with strong master passphrase',
      'Switch 2FA from SMS to an offline TOTP app (Aegis, Ente Auth) or YubiKey hardware token',
      'Store offline emergency recovery codes in a secure physical paper ledger'
    ],
    toolsUsed: ['Bitwarden', 'KeePassXC', 'Aegis Authenticator', 'YubiKey']
  },
  {
    id: 'sec-level-2',
    level: 'Level 02',
    category: 'Web Safety',
    difficulty: 'Beginner Friendly',
    title: 'Phishing Dissection & Malicious Domain Detection',
    objective: 'Identify fraudulent lookalike domains, deceptive payment portals, and spoofed email headers.',
    plainFinding: 'Attackers create near-identical copies of legitimate banking and mobile money portals using lookalike subdomains or spoofed sender addresses.',
    beforeFix: 'Clicking email and SMS links without checking URL domains; trusting green padlock icons as proof of authentic company identity.',
    afterFix: 'Inspecting exact domain origins, verifying SPF/DKIM email headers, and navigating exclusively through verified bookmarks.',
    walkthrough: [
      'Inspect URLs for punycode or typo-squatting tricks (e.g., mpesa-verify.co vs vodacom.co.tz)',
      'Analyze raw email headers to verify SPF, DKIM, and DMARC pass flags before taking action',
      'Run suspicious attachments and links through VirusTotal and urlscan.io sandbox sandpits',
      'Configure malware-blocking DNS resolvers (Quad9 9.9.9.9 or Cloudflare 1.1.1.2) on home routers'
    ],
    toolsUsed: ['urlscan.io', 'VirusTotal', 'Quad9 DNS', 'uBlock Origin']
  },
  {
    id: 'sec-level-3',
    level: 'Level 03',
    category: 'Data Protection',
    difficulty: 'Intermediate',
    title: 'Local Device Encryption & Automated Cloud Backup Isolation',
    objective: 'Ensure personal records, business accounting, and private keys remain unreadable even if a laptop or phone is physically stolen.',
    plainFinding: 'Without full-disk encryption, taking out an unencrypted SSD allows anyone to read documents, browser cookies, and saved passwords in seconds.',
    beforeFix: 'Unencrypted laptop drive; business accounting files stored on a shared USB drive without access control.',
    afterFix: 'Full-disk encryption (BitLocker / Linux LUKS XTS-AES-256) enabled, with client-side encrypted backups (Cryptomator / Restic) synced to isolated storage.',
    walkthrough: [
      'Enable BitLocker (Windows) or LUKS (Linux) with TPM 2.0 hardware protection',
      'Create zero-knowledge encrypted vaults using Cryptomator before syncing to Google Drive or OneDrive',
      'Set up the 3-2-1 backup principle: 3 copies, 2 different media types, 1 offsite encrypted archive',
      'Run a quarterly disaster restore dry-run to verify backups are not corrupted'
    ],
    toolsUsed: ['Cryptomator', 'Restic', 'Linux LUKS', 'BitLocker']
  },
  {
    id: 'sec-level-4',
    level: 'Level 04',
    category: 'Web Safety',
    difficulty: 'Intermediate',
    title: 'Browser Shielding, Cookie Isolation & API Token Hygiene',
    objective: 'Block malicious cross-site trackers, prevent session hijacking on public Wi-Fi, and guard developer API keys.',
    plainFinding: 'Unsecured public Wi-Fi networks in cafes or shared campus connections can leak unencrypted traffic and allow session cookie interception.',
    beforeFix: 'Default browser settings with third-party tracking cookies enabled, connecting to public cafe Wi-Fi without VPN or DNS encryption.',
    afterFix: 'Hardened browser profile, containerized session tabs isolating banking and social accounts, and encrypted WireGuard tunnels on untrusted Wi-Fi.',
    walkthrough: [
      'Use Firefox Multi-Account Containers to separate banking, shopping, and work sessions',
      'Install uBlock Origin with strict anti-tracking and anti-malware blocklists',
      'Connect via personal WireGuard VPN tunnel whenever using public or campus Wi-Fi',
      'Audit third-party OAuth app authorizations on Google and GitHub; revoke inactive integrations'
    ],
    toolsUsed: ['Firefox Containers', 'uBlock Origin', 'WireGuard', 'Gitsigns']
  },
  {
    id: 'sec-level-5',
    level: 'Level 05',
    category: 'Data Protection',
    difficulty: 'Advanced',
    title: 'Secure Systems Engineering & Zero-Trust Access Control',
    objective: 'Enforce cryptographic signatures, Row-Level Security in databases, and secret rotation across personal production servers.',
    plainFinding: 'Over 70% of server breaches occur due to exposed credentials in public repositories, default passwords, or open ports.',
    beforeFix: 'SSH password login allowed on port 22; database credentials committed to Git history; single admin key used across staging and production.',
    afterFix: 'Ed25519 SSH keys only, Fail2ban active, PostgreSQL Row-Level Security enabled, and secrets managed via environment vaults with audit logging.',
    walkthrough: [
      'Disable password authentication on SSH and enforce Ed25519 cryptographic keypairs',
      'Configure pre-commit hooks (git-secrets / talisman) to block accidental API key pushes',
      'Apply PostgreSQL Row-Level Security (RLS) policies to prevent cross-tenant record leakage',
      'Schedule automated container and dependency vulnerability scanning in CI/CD with Trivy'
    ],
    toolsUsed: ['Fail2ban', 'PostgreSQL RLS', 'Trivy', 'Ed25519 SSH']
  }
];

export const storeProducts: StoreProduct[] = [
  {
    id: 'thesis-tracker',
    title: 'Student Research & Thesis Submission Tracker',
    targetAudience: 'For Students',
    category: 'student',
    summary: 'A structured academic project workspace with chapter milestone checklists, automated word-count progress meters, and an audit-ready citation registry.',
    features: [
      'Chapter-by-chapter drafting and milestone schedule',
      'APA, Harvard, and IEEE citation & reference ledger',
      'Supervisor feedback and revision change log',
      'Defense examination presentation checklist & slide outline'
    ],
    priceTzs: 25000,
    priceUsd: 10,
    badge: 'Popular with Finalists',
    format: 'Google Sheets, Notion & PDF Kit',
    sampleItems: ['Chapter 1-5 Milestone Matrix', 'Citation Audit Ledger', 'Supervisor Feedback Log']
  },
  {
    id: 'retail-ledger',
    title: 'Small Business Multi-Store Inventory & Cash Ledger',
    targetAudience: 'For Small Businesses',
    category: 'business',
    summary: 'A double-entry inventory and sales ledger tailored for retail shops, eliminating stock shrinkage and balancing daily cash against mobile money.',
    features: [
      'Double-entry stock intake and sales deduction registers',
      'Daily cash-in-drawer vs M-Pesa / Tigo Pesa reconciliation sheet',
      'Customer credit book with automatic payment reminder calculator',
      'Monthly profit, cost-of-goods-sold (COGS), and net margin summary'
    ],
    priceTzs: 75000,
    priceUsd: 30,
    badge: 'Retail Standard',
    format: 'Excel, Google Sheets & Web App Template',
    sampleItems: ['Daily Stock Movement Register', 'Mobile Money Settlement Sheet', 'Customer Debt Tracker']
  },
  {
    id: 'panga-lite',
    title: 'Panga na Kupangisha Lite — Tenancy & Rent Schedule Planner',
    targetAudience: 'For Small Businesses',
    category: 'business',
    summary: 'The operational blueprint and digital ledger for landlords managing 1 to 30 rental units without expensive recurring software subscriptions.',
    features: [
      'Bilingual Swahili & English tenancy agreement contract templates',
      'Automated monthly rent calendar with late-fee calculations',
      'Tenant deposit escrow and utility meter reading tracker',
      'One-click printable digital rent receipt generator'
    ],
    priceTzs: 50000,
    priceUsd: 20,
    badge: 'Landlords & Agents',
    format: 'Interactive Ledger + Word/PDF Contracts',
    sampleItems: ['Tenancy Contract Pack (TZ Law)', 'Rent Escrow Ledger', 'Unit Maintenance Log']
  },
  {
    id: 'heslb-budget',
    title: 'Student Semester Budget & Higher Education Loan Planner',
    targetAudience: 'For Students',
    category: 'student',
    summary: 'A financial roadmap for higher learning students to budget government loans (HESLB) or allowances across 16 weeks without running out mid-semester.',
    features: [
      '16-week stipend allocation curve with daily meal allowance guardrails',
      'Academic expenses tracker (fieldwork, printing, books, laptop repair)',
      'Hostel accommodation and utility bill split calculator',
      'Emergency fund reserve and micro-savings planner'
    ],
    priceTzs: 15000,
    priceUsd: 6,
    badge: 'Campus Essential',
    format: 'Google Sheets & Mobile Ready',
    sampleItems: ['16-Week Disbursement Schedule', 'Daily Living Expense Tracker', 'Emergency Buffer Sheet']
  },
  {
    id: 'pos-cashier',
    title: 'Point-of-Sale Quick Cashier & Daily Stock Sheet',
    targetAudience: 'For Small Businesses',
    category: 'business',
    summary: 'A rapid, barcode-compatible cashier sheet for busy checkout counters, enabling shift handoffs and instant end-of-day cash reconciliation.',
    features: [
      'Rapid item lookup by barcode or product SKU code',
      'Shift-change cash drawer verification checklist',
      'Shrinkage, damage, and expired goods incident register',
      'Weekly fast-moving inventory alerts to prevent stockouts'
    ],
    priceTzs: 40000,
    priceUsd: 16,
    badge: 'Daily Operations',
    format: 'Excel & Google Sheets (Offline Capable)',
    sampleItems: ['Shift Reconciliation Slip', 'Barcode Stock Lookup', 'Spoilage Register']
  },
  {
    id: 'defense-deck',
    title: 'Engineering Final Defense & System Architecture Deck Kit',
    targetAudience: 'For Students',
    category: 'student',
    summary: 'Presentation slides and architectural diagram templates structured specifically to satisfy university computer science and engineering examination panels.',
    features: [
      '24 pre-styled system architecture, ERD, and state machine diagram cards',
      'Slide deck structured around standard university grading rubrics',
      '40 common examiner defense questions with model technical responses',
      'Live demonstration rehearsal playbook to prevent demo-day failures'
    ],
    priceTzs: 20000,
    priceUsd: 8,
    badge: 'Exam Defense Ready',
    format: 'PowerPoint, Figma & Mermaid Diagram Kit',
    sampleItems: ['Grading Rubric Slide Deck', 'Architecture Diagram Pack', 'Examiner Q&A Matrix']
  }
];

