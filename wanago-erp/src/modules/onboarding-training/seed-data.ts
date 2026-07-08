// Default Onboarding Training content — covers every major section of the
// live app. Generated once via the "Generate Default Training Content"
// button on the Onboarding Training admin page (POST /api/onboarding-
// training/seed), which skips any module whose title already exists, so
// it's safe to trigger more than once. Malayalam text here is a first-pass
// AI translation, published as-is per the team's own call — correct it
// directly in the step editor if any phrasing needs fixing, no
// regeneration needed.

export type SeedQuizOption = { en: string; ml: string };
export type SeedQuiz = {
  questionEn: string;
  questionMl: string;
  options: SeedQuizOption[];
  correctIndex: number;
};
export type SeedStep = {
  targetPath: string;
  targetSelector: string;
  explanationEn: string;
  explanationMl: string;
  quiz?: SeedQuiz;
};
export type SeedModule = {
  title: string;
  description: string;
  steps: SeedStep[];
};

export const DEFAULT_TRAINING_MODULES: SeedModule[] = [
  {
    title: "Getting Started: Dashboard",
    description: "Your home screen — what the numbers mean and where everything lives.",
    steps: [
      {
        targetPath: "/dashboard",
        targetSelector: '[data-tour-id="tour-dashboard-revenue"]',
        explanationEn: "Welcome to Wanago ERP! This is your Dashboard — it opens every time you log in. The stat cards at the top give you an instant read on the business: revenue, active leads, bookings, and dues.",
        explanationMl: "Wanago ERP-ലേക്ക് സ്വാഗതം! നിങ്ങൾ ലോഗിൻ ചെയ്യുമ്പോഴെല്ലാം തുറക്കുന്നത് ഈ ഡാഷ്ബോർഡാണ്. മുകളിലെ സ്റ്റാറ്റ് കാർഡുകൾ ബിസിനസിനെക്കുറിച്ചുള്ള ഒരു തൽക്ഷണ ചിത്രം നൽകുന്നു: വരുമാനം, സജീവ ലീഡുകൾ, ബുക്കിംഗുകൾ, ബാക്കി തുകകൾ.",
      },
      {
        targetPath: "/dashboard",
        targetSelector: '[data-tour-id="tour-dashboard-revenue"]',
        explanationEn: "This card shows Total Revenue from completed bookings. Click any stat card to jump straight to that section of the app — it's a shortcut, not just a number.",
        explanationMl: "പൂർത്തിയായ ബുക്കിംഗുകളിൽ നിന്നുള്ള മൊത്തം വരുമാനം ഈ കാർഡ് കാണിക്കുന്നു. ഏതെങ്കിലും സ്റ്റാറ്റ് കാർഡിൽ ക്ലിക്ക് ചെയ്താൽ ആ വിഭാഗത്തിലേക്ക് നേരിട്ട് പോകാം — ഇതൊരു ചുരുക്കുവഴി കൂടിയാണ്, വെറും അക്കം മാത്രമല്ല.",
        quiz: {
          questionEn: "What happens when you click a stat card on the Dashboard?",
          questionMl: "ഡാഷ്ബോർഡിലെ ഒരു സ്റ്റാറ്റ് കാർഡിൽ ക്ലിക്ക് ചെയ്താൽ എന്ത് സംഭവിക്കും?",
          options: [
            { en: "Nothing, it's just a number", ml: "ഒന്നും സംഭവിക്കില്ല, അതൊരു അക്കം മാത്രമാണ്" },
            { en: "It takes you to that section of the app", ml: "അത് ആപ്പിലെ ആ വിഭാഗത്തിലേക്ക് കൊണ്ടുപോകുന്നു" },
            { en: "It deletes the record", ml: "അത് റെക്കോർഡ് ഡിലീറ്റ് ചെയ്യുന്നു" },
          ],
          correctIndex: 1,
        },
      },
      {
        targetPath: "/dashboard",
        targetSelector: '[data-tour-id="tour-teamspace-open"]',
        explanationEn: "This mail icon at the top opens Team Space — the built-in team chat. You'll find channels for your department, direct messages with teammates, and company announcements here.",
        explanationMl: "മുകളിലെ ഈ മെയിൽ ഐക്കൺ ടീം സ്പേസ് തുറക്കുന്നു — ബിൽറ്റ്-ഇൻ ടീം ചാറ്റ്. നിങ്ങളുടെ ഡിപ്പാർട്ട്മെന്റിനുള്ള ചാനലുകൾ, സഹപ്രവർത്തകരുമായുള്ള നേരിട്ടുള്ള സന്ദേശങ്ങൾ, കമ്പനി അറിയിപ്പുകൾ എന്നിവ ഇവിടെ കാണാം.",
      },
    ],
  },
  {
    title: "My HR: Attendance & Leave",
    description: "Clock in/out, apply for leave, and track your own HR record.",
    steps: [
      {
        targetPath: "/ess",
        targetSelector: '[data-tour-id="tour-hrshell-header"]',
        explanationEn: "My HR is your personal HR self-service space — attendance, leave, payroll, assets, and more, all about you specifically. Find it any time from the sidebar.",
        explanationMl: "My HR എന്നത് നിങ്ങളുടെ വ്യക്തിഗത HR സെൽഫ്-സർവീസ് ഇടമാണ് — ഹാജർ, അവധി, ശമ്പളം, ആസ്തികൾ എന്നിവയെല്ലാം നിങ്ങളെക്കുറിച്ച് മാത്രം. സൈഡ്ബാറിൽ നിന്ന് എപ്പോൾ വേണമെങ്കിലും ഇത് കണ്ടെത്താം.",
      },
      {
        targetPath: "/ess",
        targetSelector: '[data-tour-id="tour-ess-stats"]',
        explanationEn: "The Overview tab summarizes your month at a glance — attendance percentage, remaining leave balance, and how many of your own requests are still pending.",
        explanationMl: "Overview ടാബ് നിങ്ങളുടെ മാസത്തെ ഒറ്റനോട്ടത്തിൽ സംഗ്രഹിക്കുന്നു — ഹാജർ ശതമാനം, ബാക്കിയുള്ള അവധി ബാലൻസ്, നിങ്ങളുടെ എത്ര അപേക്ഷകൾ ഇപ്പോഴും തീർപ്പുകൽപ്പിക്കാതെയുണ്ട് എന്നും.",
      },
      {
        targetPath: "/ess",
        targetSelector: '[data-tour-id="tour-ess-checkin"]',
        explanationEn: "Tap Check In when your workday starts. The system records the time — and if your office has geofencing set up, your location too. Don't forget to Check Out at the end of the day.",
        explanationMl: "നിങ്ങളുടെ ജോലി ദിവസം ആരംഭിക്കുമ്പോൾ Check In അമർത്തുക. സിസ്റ്റം സമയം രേഖപ്പെടുത്തുന്നു — നിങ്ങളുടെ ഓഫീസിൽ ജിയോഫെൻസിംഗ് സെറ്റ് ചെയ്തിട്ടുണ്ടെങ്കിൽ സ്ഥലവും. ദിവസാവസാനം Check Out ചെയ്യാൻ മറക്കരുത്.",
        quiz: {
          questionEn: "What should you do at the end of your workday?",
          questionMl: "നിങ്ങളുടെ ജോലി ദിവസം അവസാനിക്കുമ്പോൾ എന്ത് ചെയ്യണം?",
          options: [
            { en: "Nothing, it closes automatically", ml: "ഒന്നും വേണ്ട, അത് സ്വയമേവ ക്ലോസ് ആകും" },
            { en: "Check Out", ml: "Check Out ചെയ്യുക" },
            { en: "Apply for leave", ml: "അവധിക്ക് അപേക്ഷിക്കുക" },
          ],
          correctIndex: 1,
        },
      },
      {
        targetPath: "/ess",
        targetSelector: '[data-tour-id="tour-ess-apply-leave"]',
        explanationEn: "Need a day off? Use Apply here in the My Leaves section — pick the leave type (Casual, Sick, Earned, etc.), your dates, and a reason. It goes straight to your reporting manager for approval.",
        explanationMl: "ഒരു ദിവസം അവധി വേണോ? My Leaves വിഭാഗത്തിലെ Apply ബട്ടൺ ഉപയോഗിക്കുക — അവധി തരം (കാഷ്വൽ, സിക്ക്, ഏൺഡ് മുതലായവ), തീയതികൾ, കാരണം എന്നിവ തിരഞ്ഞെടുക്കുക. ഇത് നേരിട്ട് നിങ്ങളുടെ റിപ്പോർട്ടിംഗ് മാനേജർക്ക് അംഗീകാരത്തിനായി പോകും.",
      },
    ],
  },
  {
    title: "Leads",
    description: "Track and manage sales leads through your pipeline.",
    steps: [
      {
        targetPath: "/leads",
        targetSelector: '[data-tour-id="tour-leads-header"]',
        explanationEn: "The Leads page is where every potential customer enters your sales pipeline — before they become a confirmed Customer or Booking.",
        explanationMl: "ഓരോ സാധ്യതയുള്ള ഉപഭോക്താവും നിങ്ങളുടെ സെയിൽസ് പൈപ്പ്‌ലൈനിലേക്ക് പ്രവേശിക്കുന്നത് Leads പേജിലൂടെയാണ് — അവർ ഒരു സ്ഥിരീകരിച്ച Customer അല്ലെങ്കിൽ Booking ആകുന്നതിന് മുൻപ്.",
      },
      {
        targetPath: "/leads",
        targetSelector: '[data-tour-id="tour-leads-add"]',
        explanationEn: "Click Add Lead to create a new one — fill in their contact details, destination interest, and source (where the lead came from). Assign it to a sales rep so it doesn't go cold.",
        explanationMl: "പുതിയൊരു ലീഡ് ചേർക്കാൻ Add Lead ക്ലിക്ക് ചെയ്യുക — അവരുടെ കോൺടാക്ട് വിവരങ്ങൾ, ഇഷ്ടപ്പെടുന്ന ലക്ഷ്യസ്ഥാനം, സോഴ്‌സ് (ലീഡ് എവിടെ നിന്ന് വന്നു) എന്നിവ പൂരിപ്പിക്കുക. തണുത്തുപോകാതിരിക്കാൻ ഒരു സെയിൽസ് പ്രതിനിധിക്ക് അസൈൻ ചെയ്യുക.",
        quiz: {
          questionEn: "Why should you assign a lead to a sales rep right away?",
          questionMl: "ഒരു ലീഡ് ഉടനടി ഒരു സെയിൽസ് പ്രതിനിധിക്ക് അസൈൻ ചെയ്യേണ്ടത് എന്തുകൊണ്ട്?",
          options: [
            { en: "So it doesn't go cold / unattended", ml: "അത് തണുത്തുപോകാതിരിക്കാൻ / ശ്രദ്ധിക്കപ്പെടാതിരിക്കാതിരിക്കാൻ" },
            { en: "It's required to save the lead", ml: "ലീഡ് സേവ് ചെയ്യാൻ അത് നിർബന്ധമാണ്" },
            { en: "It changes the lead's destination", ml: "അത് ലീഡിന്റെ ലക്ഷ്യസ്ഥാനം മാറ്റുന്നു" },
          ],
          correctIndex: 0,
        },
      },
      {
        targetPath: "/leads",
        targetSelector: '[data-tour-id="tour-leads-header"]',
        explanationEn: "Leads move through stages as they progress — New, Contacted, Qualified, and eventually Won or Lost. The daily reminders system will nag you (and your manager) if a lead goes untouched for too long.",
        explanationMl: "ലീഡുകൾ പുരോഗമിക്കുമ്പോൾ ഘട്ടങ്ങളിലൂടെ നീങ്ങുന്നു — New, Contacted, Qualified, ഒടുവിൽ Won അല്ലെങ്കിൽ Lost. ഒരു ലീഡ് വളരെക്കാലം സ്പർശിക്കാതെ കിടന്നാൽ ദൈനംദിന ഓർമ്മപ്പെടുത്തൽ സിസ്റ്റം നിങ്ങളെയും (നിങ്ങളുടെ മാനേജരെയും) ഓർമ്മിപ്പിക്കും.",
      },
      {
        targetPath: "/leads",
        targetSelector: '[data-tour-id="tour-leads-filters"]',
        explanationEn: "These filter tabs jump straight to a specific stage — click \"Qualified\" to see only leads ready to convert, for example, instead of scrolling the full list.",
        explanationMl: "ഈ ഫിൽട്ടർ ടാബുകൾ ഒരു നിശ്ചിത ഘട്ടത്തിലേക്ക് നേരിട്ട് പോകുന്നു — ഉദാഹരണത്തിന്, കൺവേർട്ട് ചെയ്യാൻ തയ്യാറായ ലീഡുകൾ മാത്രം കാണാൻ \"Qualified\" ക്ലിക്ക് ചെയ്യുക, മുഴുവൻ ലിസ്റ്റും സ്ക്രോൾ ചെയ്യുന്നതിന് പകരം.",
      },
      {
        targetPath: "/leads",
        targetSelector: '[data-tour-id="tour-leads-import"]',
        explanationEn: "Got a spreadsheet of leads from a fair or a campaign? Import lets you bulk-upload them in one go instead of adding each one by hand.",
        explanationMl: "ഒരു ഫെയറിൽ നിന്നോ ക്യാമ്പെയിനിൽ നിന്നോ ലീഡുകളുടെ ഒരു സ്പ്രെഡ്ഷീറ്റ് ലഭിച്ചോ? ഓരോന്നും കൈകൊണ്ട് ചേർക്കുന്നതിന് പകരം Import ഉപയോഗിച്ച് ഒറ്റയടിക്ക് ബൾക്ക്-അപ്‌ലോഡ് ചെയ്യാം.",
      },
    ],
  },
  {
    title: "Customers",
    description: "Your directory of confirmed customer records.",
    steps: [
      {
        targetPath: "/customers",
        targetSelector: '[data-tour-id="tour-customers-header"]',
        explanationEn: "Once a lead is ready to book, they become a Customer here — this is your permanent directory of everyone who's actually done business with Wanago.",
        explanationMl: "ഒരു ലീഡ് ബുക്ക് ചെയ്യാൻ തയ്യാറാകുമ്പോൾ, അവർ ഇവിടെ ഒരു Customer ആയി മാറുന്നു — Wanago-യുമായി യഥാർത്ഥത്തിൽ ബിസിനസ് ചെയ്ത എല്ലാവരുടെയും സ്ഥിരമായ ഡയറക്ടറിയാണ് ഇത്.",
      },
      {
        targetPath: "/customers",
        targetSelector: '[data-tour-id="tour-customers-add"]',
        explanationEn: "Use Add Customer to create a record directly, or convert one from an existing Lead. Each customer's page shows their full booking history.",
        explanationMl: "നേരിട്ട് ഒരു റെക്കോർഡ് ഉണ്ടാക്കാൻ Add Customer ഉപയോഗിക്കുക, അല്ലെങ്കിൽ നിലവിലുള്ള ഒരു Lead-ൽ നിന്ന് കൺവേർട്ട് ചെയ്യുക. ഓരോ ഉപഭോക്താവിന്റെയും പേജിൽ അവരുടെ മുഴുവൻ ബുക്കിംഗ് ചരിത്രം കാണാം.",
      },
      {
        targetPath: "/customers",
        targetSelector: '[data-tour-id="tour-customers-filters"]',
        explanationEn: "Use these tabs to filter by customer type — domestic vs. international, for instance — so you can find the right group quickly.",
        explanationMl: "ഉപഭോക്തൃ തരം അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യാൻ ഈ ടാബുകൾ ഉപയോഗിക്കുക — ഉദാഹരണത്തിന് ആഭ്യന്തരം vs. അന്തർദേശീയം — ശരിയായ ഗ്രൂപ്പ് വേഗത്തിൽ കണ്ടെത്താം.",
      },
      {
        targetPath: "/customers",
        targetSelector: '[data-tour-id="tour-customers-import"]',
        explanationEn: "Import lets you bulk-load customer records from a spreadsheet — handy when migrating from an old system or onboarding a big group at once.",
        explanationMl: "ഒരു സ്പ്രെഡ്ഷീറ്റിൽ നിന്ന് ഉപഭോക്തൃ റെക്കോർഡുകൾ ബൾക്കായി ലോഡ് ചെയ്യാൻ Import സഹായിക്കുന്നു — പഴയ സിസ്റ്റത്തിൽ നിന്ന് മൈഗ്രേറ്റ് ചെയ്യുമ്പോഴോ ഒരു വലിയ ഗ്രൂപ്പിനെ ഒറ്റയടിക്ക് ചേർക്കുമ്പോഴോ ഉപകാരപ്രദം.",
      },
    ],
  },
  {
    title: "Bookings",
    description: "Create and manage confirmed travel bookings.",
    steps: [
      {
        targetPath: "/bookings",
        targetSelector: '[data-tour-id="tour-bookings-header"]',
        explanationEn: "Bookings are confirmed trips — this is where sales, operations, and finance all meet. A booking tracks the customer, destination, amount, and approval status.",
        explanationMl: "സ്ഥിരീകരിച്ച യാത്രകളാണ് Bookings — സെയിൽസ്, ഓപ്പറേഷൻസ്, ഫിനാൻസ് എന്നിവയെല്ലാം ഒത്തുചേരുന്നിടം. ഒരു ബുക്കിംഗ് ഉപഭോക്താവിനെയും, ലക്ഷ്യസ്ഥാനത്തെയും, തുകയെയും, അംഗീകാര നിലയെയും ട്രാക്ക് ചെയ്യുന്നു.",
      },
      {
        targetPath: "/bookings",
        targetSelector: '[data-tour-id="tour-bookings-add"]',
        explanationEn: "Click New Booking to start one. Most bookings need Finance approval and then Operations approval before they're fully confirmed — check the Approvals pages for that workflow.",
        explanationMl: "ഒരെണ്ണം തുടങ്ങാൻ New Booking ക്ലിക്ക് ചെയ്യുക. മിക്ക ബുക്കിംഗുകൾക്കും പൂർണ്ണമായി സ്ഥിരീകരിക്കുന്നതിന് മുൻപ് Finance അംഗീകാരവും പിന്നീട് Operations അംഗീകാരവും വേണം — ആ വർക്ക്ഫ്ലോയ്ക്കായി Approvals പേജുകൾ പരിശോധിക്കുക.",
        quiz: {
          questionEn: "What two approvals does a booking typically need before it's fully confirmed?",
          questionMl: "ഒരു ബുക്കിംഗ് പൂർണ്ണമായി സ്ഥിരീകരിക്കുന്നതിന് മുൻപ് സാധാരണയായി ഏത് രണ്ട് അംഗീകാരങ്ങൾ വേണം?",
          options: [
            { en: "Sales and Marketing", ml: "സെയിൽസും മാർക്കറ്റിംഗും" },
            { en: "Finance and Operations", ml: "ഫിനാൻസും ഓപ്പറേഷൻസും" },
            { en: "HR and Admin", ml: "HR-ഉം അഡ്മിനും" },
          ],
          correctIndex: 1,
        },
      },
      {
        targetPath: "/bookings",
        targetSelector: '[data-tour-id="tour-bookings-stats"]',
        explanationEn: "These tiles give you an at-a-glance count of total, pending, and confirmed bookings, plus the total amount still due across all of them.",
        explanationMl: "മൊത്തം, തീർപ്പുകൽപ്പിക്കാത്ത, സ്ഥിരീകരിച്ച ബുക്കിംഗുകളുടെ എണ്ണവും, എല്ലാം കൂടി ഇനിയും ബാക്കിയുള്ള തുകയും ഒറ്റനോട്ടത്തിൽ ഈ ടൈലുകൾ കാണിക്കുന്നു.",
      },
      {
        targetPath: "/bookings",
        targetSelector: '[data-tour-id="tour-bookings-filters"]',
        explanationEn: "Use the status tabs to jump to just Pending or Confirmed bookings — useful when you're chasing down what still needs approval.",
        explanationMl: "Pending അല്ലെങ്കിൽ Confirmed ബുക്കിംഗുകളിലേക്ക് മാത്രം പോകാൻ സ്റ്റാറ്റസ് ടാബുകൾ ഉപയോഗിക്കുക — ഇനിയും അംഗീകാരം വേണ്ടത് എന്താണെന്ന് നോക്കുമ്പോൾ ഉപകാരപ്രദം.",
      },
    ],
  },
  {
    title: "Quotations",
    description: "Draft and send price quotes before a booking is confirmed.",
    steps: [
      {
        targetPath: "/quotations",
        targetSelector: '[data-tour-id="tour-quotations-header"]',
        explanationEn: "Before a customer commits to a Booking, you'll often send them a Quotation — a formal price breakdown they can review and approve.",
        explanationMl: "ഒരു ഉപഭോക്താവ് Booking-ന് പ്രതിജ്ഞാബദ്ധരാകുന്നതിന് മുൻപ്, പലപ്പോഴും അവർക്ക് ഒരു Quotation അയക്കും — അവർക്ക് പരിശോധിച്ച് അംഗീകരിക്കാവുന്ന ഔപചാരികമായ വില വിശദാംശം.",
      },
      {
        targetPath: "/quotations",
        targetSelector: '[data-tour-id="tour-quotations-add"]',
        explanationEn: "New Quotation lets you build a priced itinerary. Once the customer agrees, convert it straight into a Booking — no need to re-enter the details.",
        explanationMl: "New Quotation ഉപയോഗിച്ച് വിലയിട്ട ഒരു യാത്രാ പദ്ധതി ഉണ്ടാക്കാം. ഉപഭോക്താവ് സമ്മതിച്ചുകഴിഞ്ഞാൽ, അത് നേരിട്ട് ഒരു Booking ആയി കൺവേർട്ട് ചെയ്യാം — വിശദാംശങ്ങൾ വീണ്ടും നൽകേണ്ട ആവശ്യമില്ല.",
      },
      {
        targetPath: "/quotations",
        targetSelector: '[data-tour-id="tour-quotations-stats"]',
        explanationEn: "Track how many quotations are Sent, Accepted, or already Converted into bookings — a quick read on how well quotes are closing.",
        explanationMl: "എത്ര ക്വട്ടേഷനുകൾ Sent, Accepted, അല്ലെങ്കിൽ ഇതിനകം ബുക്കിംഗുകളായി Converted ആയി എന്ന് ട്രാക്ക് ചെയ്യുക — ക്വോട്ടുകൾ എത്ര നന്നായി ക്ലോസ് ആകുന്നു എന്നതിന്റെ വേഗത്തിലുള്ള സൂചന.",
      },
      {
        targetPath: "/quotations",
        targetSelector: '[data-tour-id="tour-quotations-filters"]',
        explanationEn: "Filter by status to see, say, only quotations still waiting on the customer to respond.",
        explanationMl: "ഇപ്പോഴും ഉപഭോക്താവ് പ്രതികരിക്കാൻ കാത്തിരിക്കുന്ന ക്വട്ടേഷനുകൾ മാത്രം കാണാൻ സ്റ്റാറ്റസ് അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക.",
      },
    ],
  },
  {
    title: "Packages",
    description: "Manage your catalog of pre-built tour packages.",
    steps: [
      {
        targetPath: "/packages",
        targetSelector: '[data-tour-id="tour-packages-header"]',
        explanationEn: "Packages are your ready-made tour offerings — a fixed itinerary and price point that sales can quote quickly without building one from scratch each time.",
        explanationMl: "നിങ്ങളുടെ റെഡിമെയ്ഡ് ടൂർ ഓഫറുകളാണ് Packages — ഒരു നിശ്ചിത യാത്രാ പദ്ധതിയും വിലയും, ഓരോ തവണയും പുതിയതായി ഉണ്ടാക്കാതെ സെയിൽസിന് വേഗത്തിൽ ക്വോട്ട് ചെയ്യാൻ കഴിയും.",
      },
      {
        targetPath: "/packages",
        targetSelector: '[data-tour-id="tour-packages-add"]',
        explanationEn: "Use Add Package to list a new one — destination, duration, inclusions, and price. Keeping this catalog current makes quoting much faster for the whole sales team.",
        explanationMl: "പുതിയൊരെണ്ണം ചേർക്കാൻ Add Package ഉപയോഗിക്കുക — ലക്ഷ്യസ്ഥാനം, ദൈർഘ്യം, ഉൾപ്പെടുത്തലുകൾ, വില. ഈ കാറ്റലോഗ് കാലികമായി സൂക്ഷിക്കുന്നത് മുഴുവൻ സെയിൽസ് ടീമിനും ക്വോട്ട് ചെയ്യൽ വേഗത്തിലാക്കുന്നു.",
      },
      {
        targetPath: "/packages",
        targetSelector: '[data-tour-id="tour-packages-filters"]',
        explanationEn: "Filter packages by status — active ones are what sales should be quoting from; retired ones stay for reference but shouldn't be offered anymore.",
        explanationMl: "പാക്കേജുകൾ സ്റ്റാറ്റസ് അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക — സെയിൽസ് ക്വോട്ട് ചെയ്യേണ്ടത് ആക്റ്റീവ് ആയവയാണ്; റിട്ടയർ ചെയ്തവ റഫറൻസിനായി നിലനിൽക്കും, പക്ഷേ ഇനി ഓഫർ ചെയ്യരുത്.",
      },
      {
        targetPath: "/packages",
        targetSelector: '[data-tour-id="tour-packages-import"]',
        explanationEn: "Already have a package list in a spreadsheet? Import brings them all in at once instead of re-typing every one.",
        explanationMl: "ഒരു സ്പ്രെഡ്ഷീറ്റിൽ ഇതിനകം പാക്കേജ് ലിസ്റ്റ് ഉണ്ടോ? ഓരോന്നും വീണ്ടും ടൈപ്പ് ചെയ്യുന്നതിന് പകരം Import എല്ലാം ഒറ്റയടിക്ക് കൊണ്ടുവരുന്നു.",
      },
    ],
  },
  {
    title: "Suppliers",
    description: "Your directory of hotels, transport, and other vendors.",
    steps: [
      {
        targetPath: "/suppliers",
        targetSelector: '[data-tour-id="tour-suppliers-header"]',
        explanationEn: "Suppliers covers everyone Wanago books through on the ground — hotels, transport operators, guides, and other vendors that packages and itineraries rely on.",
        explanationMl: "Wanago നിലത്തുവെച്ച് ബുക്ക് ചെയ്യുന്ന എല്ലാവരെയും Suppliers ഉൾക്കൊള്ളുന്നു — ഹോട്ടലുകൾ, ട്രാൻസ്പോർട്ട് ഓപ്പറേറ്റർമാർ, ഗൈഡുകൾ, പാക്കേജുകളും യാത്രാ പദ്ധതികളും ആശ്രയിക്കുന്ന മറ്റ് വെണ്ടർമാർ.",
      },
      {
        targetPath: "/suppliers",
        targetSelector: '[data-tour-id="tour-suppliers-add"]',
        explanationEn: "Add Supplier to register a new vendor with their contact info and category — this makes them selectable when building Itineraries.",
        explanationMl: "പുതിയൊരു വെണ്ടറെ അവരുടെ കോൺടാക്ട് വിവരങ്ങളും വിഭാഗവുമായി രജിസ്റ്റർ ചെയ്യാൻ Add Supplier ഉപയോഗിക്കുക — ഇത് Itineraries ഉണ്ടാക്കുമ്പോൾ അവരെ തിരഞ്ഞെടുക്കാൻ കഴിയുന്നതാക്കുന്നു.",
      },
      {
        targetPath: "/suppliers",
        targetSelector: '[data-tour-id="tour-suppliers-filters"]',
        explanationEn: "Filter by category — Hotels, Transport, Guides, and so on — to quickly find the right vendor type when you're building an itinerary.",
        explanationMl: "Hotels, Transport, Guides തുടങ്ങിയ വിഭാഗം അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക — ഒരു യാത്രാ പദ്ധതി ഉണ്ടാക്കുമ്പോൾ ശരിയായ വെണ്ടർ തരം വേഗത്തിൽ കണ്ടെത്താം.",
      },
      {
        targetPath: "/suppliers",
        targetSelector: '[data-tour-id="tour-suppliers-import"]',
        explanationEn: "Import lets you bulk-add your existing vendor list from a spreadsheet instead of entering each supplier one at a time.",
        explanationMl: "ഓരോ വെണ്ടറെയും ഒറ്റയായി നൽകുന്നതിന് പകരം നിലവിലുള്ള വെണ്ടർ ലിസ്റ്റ് ഒരു സ്പ്രെഡ്ഷീറ്റിൽ നിന്ന് ബൾക്കായി ചേർക്കാൻ Import സഹായിക്കുന്നു.",
      },
    ],
  },
  {
    title: "Itineraries",
    description: "Build day-by-day travel plans for bookings and packages.",
    steps: [
      {
        targetPath: "/itineraries",
        targetSelector: '[data-tour-id="tour-itineraries-header"]',
        explanationEn: "An Itinerary is the day-by-day plan behind a trip — where the customer is each day, what's included, and which Suppliers are involved.",
        explanationMl: "ഒരു യാത്രയ്ക്ക് പിന്നിലെ ദിവസംതോറുമുള്ള പദ്ധതിയാണ് Itinerary — ഓരോ ദിവസവും ഉപഭോക്താവ് എവിടെയാണ്, എന്തെല്ലാം ഉൾപ്പെടുന്നു, ഏതൊക്കെ Suppliers ഉൾപ്പെട്ടിരിക്കുന്നു.",
      },
      {
        targetPath: "/itineraries",
        targetSelector: '[data-tour-id="tour-itineraries-add"]',
        explanationEn: "Add Itinerary lets you build it out day by day. These attach to Packages and Bookings so Operations knows exactly what to arrange.",
        explanationMl: "Add Itinerary ഉപയോഗിച്ച് ദിവസംതോറും ഇത് ഉണ്ടാക്കാം. Packages, Bookings എന്നിവയുമായി ഇവ ബന്ധിപ്പിക്കപ്പെടുന്നു, അതിനാൽ എന്താണ് ക്രമീകരിക്കേണ്ടതെന്ന് Operations-ന് കൃത്യമായി അറിയാം.",
      },
      {
        targetPath: "/itineraries",
        targetSelector: '[data-tour-id="tour-itineraries-filters"]',
        explanationEn: "Use the status tabs to see which itineraries are still drafts versus ones that are finalized and ready to hand to Operations.",
        explanationMl: "ഏതൊക്കെ യാത്രാ പദ്ധതികൾ ഇപ്പോഴും ഡ്രാഫ്റ്റാണ്, ഏതൊക്കെ അന്തിമമായി Operations-ന് കൈമാറാൻ തയ്യാറാണ് എന്ന് കാണാൻ സ്റ്റാറ്റസ് ടാബുകൾ ഉപയോഗിക്കുക.",
      },
      {
        targetPath: "/itineraries",
        targetSelector: '[data-tour-id="tour-itineraries-import"]',
        explanationEn: "Import lets you bulk-load itineraries from a spreadsheet — useful when migrating a batch of existing trip plans.",
        explanationMl: "നിലവിലുള്ള ഒരു കൂട്ടം യാത്രാ പദ്ധതികൾ മൈഗ്രേറ്റ് ചെയ്യുമ്പോൾ ഉപകാരപ്രദമായ, ഒരു സ്പ്രെഡ്ഷീറ്റിൽ നിന്ന് യാത്രാ പദ്ധതികൾ ബൾക്കായി ലോഡ് ചെയ്യാൻ Import സഹായിക്കുന്നു.",
      },
    ],
  },
  {
    title: "Operations Approvals",
    description: "Final sign-off on bookings after Finance has approved them.",
    steps: [
      {
        targetPath: "/operations-approvals",
        targetSelector: '[data-tour-id="tour-opsapprovals-header"]',
        explanationEn: "Once Finance approves a booking, it lands here for Operations to give the final sign-off — confirming logistics can actually be arranged.",
        explanationMl: "Finance ഒരു ബുക്കിംഗ് അംഗീകരിച്ചുകഴിഞ്ഞാൽ, അന്തിമ അംഗീകാരത്തിനായി അത് ഇവിടെ Operations-ന് ലഭിക്കുന്നു — ലോജിസ്റ്റിക്സ് യഥാർത്ഥത്തിൽ ക്രമീകരിക്കാൻ കഴിയുമെന്ന് സ്ഥിരീകരിക്കുന്നു.",
      },
      {
        targetPath: "/operations-approvals",
        targetSelector: '[data-tour-id="tour-opsapprovals-refresh"]',
        explanationEn: "Open any pending item to see full booking details, then Approve or Reject with a reason. Rejecting sends it back to sales to fix and resubmit.",
        explanationMl: "മുഴുവൻ ബുക്കിംഗ് വിശദാംശങ്ങൾ കാണാൻ ഏതെങ്കിലും തീർപ്പുകൽപ്പിക്കാത്ത ഇനം തുറക്കുക, എന്നിട്ട് ഒരു കാരണത്തോടെ Approve അല്ലെങ്കിൽ Reject ചെയ്യുക. Reject ചെയ്യുന്നത് ശരിയാക്കി വീണ്ടും സമർപ്പിക്കാൻ സെയിൽസിന് തിരികെ അയക്കുന്നു.",
      },
    ],
  },
  {
    title: "Invoices",
    description: "Bill customers and track what's owed.",
    steps: [
      {
        targetPath: "/invoices",
        targetSelector: '[data-tour-id="tour-invoices-header"]',
        explanationEn: "Invoices bill the customer for a confirmed Booking. Finance tracks which are paid, partially paid, or overdue from here.",
        explanationMl: "ഒരു സ്ഥിരീകരിച്ച Booking-നായി ഉപഭോക്താവിന് ബിൽ ചെയ്യുന്നത് Invoices ആണ്. ഏതൊക്കെ അടച്ചു, ഭാഗികമായി അടച്ചു, അല്ലെങ്കിൽ കാലാവധി കഴിഞ്ഞു എന്ന് Finance ഇവിടെ നിന്ന് ട്രാക്ക് ചെയ്യുന്നു.",
      },
      {
        targetPath: "/invoices",
        targetSelector: '[data-tour-id="tour-invoices-add"]',
        explanationEn: "New Invoice generates a bill against a booking. Once the customer pays, record it under Payments so both stay in sync.",
        explanationMl: "New Invoice ഒരു ബുക്കിംഗിനെതിരെ ഒരു ബിൽ സൃഷ്ടിക്കുന്നു. ഉപഭോക്താവ് പണം അടച്ചുകഴിഞ്ഞാൽ, രണ്ടും സമന്വയത്തിൽ നിലനിർത്താൻ Payments-ന് കീഴിൽ അത് രേഖപ്പെടുത്തുക.",
        quiz: {
          questionEn: "After a customer pays an invoice, where should you record the payment?",
          questionMl: "ഒരു ഉപഭോക്താവ് ഒരു ഇൻവോയ്സ് അടച്ചതിന് ശേഷം, പേയ്മെന്റ് എവിടെ രേഖപ്പെടുത്തണം?",
          options: [
            { en: "In Payments", ml: "Payments-ൽ" },
            { en: "In Leads", ml: "Leads-ൽ" },
            { en: "Nowhere, invoices update automatically", ml: "എവിടെയും വേണ്ട, ഇൻവോയ്സുകൾ സ്വയമേവ അപ്ഡേറ്റ് ആകും" },
          ],
          correctIndex: 0,
        },
      },
      {
        targetPath: "/invoices",
        targetSelector: '[data-tour-id="tour-invoices-stats"]',
        explanationEn: "These tiles flag what needs attention — Overdue invoices especially, since those are payments you're waiting on past their due date.",
        explanationMl: "ശ്രദ്ധ വേണ്ടത് എന്താണെന്ന് ഈ ടൈലുകൾ ചൂണ്ടിക്കാണിക്കുന്നു — പ്രത്യേകിച്ച് Overdue ഇൻവോയ്സുകൾ, കാരണം അവ കാലാവധി കഴിഞ്ഞിട്ടും കാത്തിരിക്കുന്ന പേയ്മെന്റുകളാണ്.",
      },
      {
        targetPath: "/invoices",
        targetSelector: '[data-tour-id="tour-invoices-import"]',
        explanationEn: "Import lets you bulk-create invoices from a spreadsheet, rather than entering each one individually.",
        explanationMl: "ഓരോന്നും വെവ്വേറെ നൽകുന്നതിന് പകരം ഒരു സ്പ്രെഡ്ഷീറ്റിൽ നിന്ന് ഇൻവോയ്സുകൾ ബൾക്കായി ഉണ്ടാക്കാൻ Import സഹായിക്കുന്നു.",
      },
    ],
  },
  {
    title: "Payments",
    description: "Record customer payments against invoices.",
    steps: [
      {
        targetPath: "/payments",
        targetSelector: '[data-tour-id="tour-payments-header"]',
        explanationEn: "Payments is where every rupee received from a customer gets logged — it's what keeps your Invoices and Pending Dues accurate on the Dashboard.",
        explanationMl: "ഒരു ഉപഭോക്താവിൽ നിന്ന് ലഭിക്കുന്ന ഓരോ രൂപയും രേഖപ്പെടുത്തുന്നത് Payments-ലാണ് — ഇത് ഡാഷ്ബോർഡിലെ Invoices, Pending Dues എന്നിവ കൃത്യമായി നിലനിർത്തുന്നു.",
      },
      {
        targetPath: "/payments",
        targetSelector: '[data-tour-id="tour-payments-add"]',
        explanationEn: "Record Payment against the relevant invoice with the amount and method (cash, bank transfer, etc.). Partial payments are fine — the invoice tracks the remaining balance.",
        explanationMl: "തുകയും രീതിയും (ക്യാഷ്, ബാങ്ക് ട്രാൻസ്ഫർ മുതലായവ) സഹിതം ബന്ധപ്പെട്ട ഇൻവോയ്സിനെതിരെ Record Payment ചെയ്യുക. ഭാഗിക പേയ്മെന്റുകൾ കുഴപ്പമില്ല — ബാക്കിയുള്ള തുക ഇൻവോയ്സ് ട്രാക്ക് ചെയ്യും.",
      },
      {
        targetPath: "/payments",
        targetSelector: '[data-tour-id="tour-payments-stats"]',
        explanationEn: "These tiles show total payments collected and how much has come in this month specifically — a quick pulse check on cash flow.",
        explanationMl: "മൊത്തം ശേഖരിച്ച പേയ്മെന്റുകളും ഈ മാസം പ്രത്യേകമായി എത്ര ലഭിച്ചു എന്നും ഈ ടൈലുകൾ കാണിക്കുന്നു — ക്യാഷ് ഫ്ലോയുടെ വേഗത്തിലുള്ള പരിശോധന.",
      },
      {
        targetPath: "/payments",
        targetSelector: '[data-tour-id="tour-payments-import"]',
        explanationEn: "Import lets you bulk-record payments from a spreadsheet — useful for catching up a backlog or migrating history.",
        explanationMl: "ഒരു ബാക്ക്‌ലോഗ് പിടിക്കാനോ ചരിത്രം മൈഗ്രേറ്റ് ചെയ്യാനോ ഉപകാരപ്രദമായ, ഒരു സ്പ്രെഡ്ഷീറ്റിൽ നിന്ന് പേയ്മെന്റുകൾ ബൾക്കായി രേഖപ്പെടുത്താൻ Import സഹായിക്കുന്നു.",
      },
    ],
  },
  {
    title: "Expenses",
    description: "Log and track operational business expenses.",
    steps: [
      {
        targetPath: "/expenses",
        targetSelector: '[data-tour-id="tour-expenses-header"]',
        explanationEn: "Expenses tracks money going out — supplier payments, office costs, anything the business spends that isn't payroll.",
        explanationMl: "പുറത്തേക്ക് പോകുന്ന പണം ട്രാക്ക് ചെയ്യുന്നത് Expenses ആണ് — വെണ്ടർ പേയ്മെന്റുകൾ, ഓഫീസ് ചെലവുകൾ, ശമ്പളമല്ലാത്ത ബിസിനസ് ചെലവുകൾ.",
      },
      {
        targetPath: "/expenses",
        targetSelector: '[data-tour-id="tour-expenses-add"]',
        explanationEn: "New Expense logs a cost with its category and amount. Depending on your role, some expenses may need Finance approval before they're finalized.",
        explanationMl: "New Expense ഒരു ചെലവ് അതിന്റെ വിഭാഗവും തുകയും സഹിതം രേഖപ്പെടുത്തുന്നു. നിങ്ങളുടെ റോൾ അനുസരിച്ച്, ചില ചെലവുകൾക്ക് അന്തിമമാക്കുന്നതിന് മുൻപ് Finance അംഗീകാരം വേണ്ടിവന്നേക്കാം.",
      },
      {
        targetPath: "/expenses",
        targetSelector: '[data-tour-id="tour-expenses-stats"]',
        explanationEn: "Total Amount and Pending here give you a running sense of spend — Paid means Finance has already settled it.",
        explanationMl: "ചെലവിന്റെ ഒരു തുടർച്ചയായ ധാരണ ഇവിടെ Total Amount, Pending എന്നിവ നൽകുന്നു — Paid എന്നാൽ Finance ഇതിനകം തീർപ്പാക്കി എന്നാണ്.",
      },
      {
        targetPath: "/expenses",
        targetSelector: '[data-tour-id="tour-expenses-import"]',
        explanationEn: "Import lets you bulk-add expenses from a spreadsheet instead of logging each one by hand.",
        explanationMl: "ഓരോന്നും കൈകൊണ്ട് രേഖപ്പെടുത്തുന്നതിന് പകരം ഒരു സ്പ്രെഡ്ഷീറ്റിൽ നിന്ന് ചെലവുകൾ ബൾക്കായി ചേർക്കാൻ Import സഹായിക്കുന്നു.",
      },
    ],
  },
  {
    title: "Sales Incentives",
    description: "How your incentive payout is calculated.",
    steps: [
      {
        targetPath: "/incentives",
        targetSelector: '[data-tour-id="tour-incentives-header"]',
        explanationEn: "This page shows how Sales Incentives are computed — a tiered structure based on how much of your monthly profit target you've hit.",
        explanationMl: "Sales Incentives എങ്ങനെ കണക്കാക്കുന്നു എന്ന് ഈ പേജ് കാണിക്കുന്നു — നിങ്ങളുടെ പ്രതിമാസ ലാഭ ലക്ഷ്യത്തിന്റെ എത്ര ശതമാനം കൈവരിച്ചു എന്നതിനെ അടിസ്ഥാനമാക്കിയുള്ള ഒരു ടയേഡ് ഘടന.",
      },
      {
        targetPath: "/incentives",
        targetSelector: '[data-tour-id="tour-incentives-refresh"]',
        explanationEn: "It's read-only for most people — Admin/Finance configure the rates and thresholds in Settings. Check here anytime to see where you stand this month.",
        explanationMl: "മിക്ക ആളുകൾക്കും ഇത് റീഡ്-ഒൺലി ആണ് — Admin/Finance ആണ് Settings-ൽ നിരക്കുകളും പരിധികളും ക്രമീകരിക്കുന്നത്. ഈ മാസം നിങ്ങൾ എവിടെ നിൽക്കുന്നു എന്ന് കാണാൻ എപ്പോൾ വേണമെങ്കിലും ഇവിടെ പരിശോധിക്കാം.",
      },
    ],
  },
  {
    title: "Finance Approvals",
    description: "Review bookings, quotations, and invoices awaiting Finance sign-off.",
    steps: [
      {
        targetPath: "/approvals",
        targetSelector: '[data-tour-id="tour-financeapprovals-header"]',
        explanationEn: "Finance Approvals is the first checkpoint a new booking passes through — verifying the numbers before Operations gets involved.",
        explanationMl: "ഒരു പുതിയ ബുക്കിംഗ് കടന്നുപോകുന്ന ആദ്യ ചെക്ക്പോയിന്റാണ് Finance Approvals — Operations ഉൾപ്പെടുന്നതിന് മുൻപ് കണക്കുകൾ പരിശോധിക്കുന്നു.",
      },
      {
        targetPath: "/approvals",
        targetSelector: '[data-tour-id="tour-financeapprovals-refresh"]',
        explanationEn: "Open an item to review full details, then Approve to send it on to Operations, or Reject with a reason to send it back to sales.",
        explanationMl: "മുഴുവൻ വിശദാംശങ്ങൾ പരിശോധിക്കാൻ ഒരു ഇനം തുറക്കുക, എന്നിട്ട് Operations-ലേക്ക് അയക്കാൻ Approve ചെയ്യുക, അല്ലെങ്കിൽ സെയിൽസിലേക്ക് തിരികെ അയക്കാൻ ഒരു കാരണത്തോടെ Reject ചെയ്യുക.",
      },
    ],
  },
  {
    title: "Campaigns",
    description: "Track marketing campaigns and their lead generation.",
    steps: [
      {
        targetPath: "/campaigns",
        targetSelector: '[data-tour-id="tour-campaigns-header"]',
        explanationEn: "Campaigns tracks your marketing efforts — social media pushes, ad spends, promotions — and how many Leads each one actually generates.",
        explanationMl: "നിങ്ങളുടെ മാർക്കറ്റിംഗ് ശ്രമങ്ങൾ ട്രാക്ക് ചെയ്യുന്നത് Campaigns ആണ് — സോഷ്യൽ മീഡിയ പ്രമോഷനുകൾ, പരസ്യ ചെലവുകൾ — ഓരോന്നും യഥാർത്ഥത്തിൽ എത്ര Leads ഉണ്ടാക്കുന്നു എന്നും.",
      },
      {
        targetPath: "/campaigns",
        targetSelector: '[data-tour-id="tour-campaigns-add"]',
        explanationEn: "Add Campaign to start tracking a new one, with its budget and channel. This helps the team see which marketing spend is actually paying off.",
        explanationMl: "പുതിയൊരെണ്ണം ട്രാക്ക് ചെയ്യാൻ തുടങ്ങാൻ Add Campaign ഉപയോഗിക്കുക, ബജറ്റും ചാനലും സഹിതം. ഏത് മാർക്കറ്റിംഗ് ചെലവാണ് യഥാർത്ഥത്തിൽ ഫലം നൽകുന്നതെന്ന് കാണാൻ ഇത് ടീമിനെ സഹായിക്കുന്നു.",
      },
      {
        targetPath: "/campaigns",
        targetSelector: '[data-tour-id="tour-campaigns-filters"]',
        explanationEn: "Filter by status to see which campaigns are currently Active versus ones that have already ended.",
        explanationMl: "ഇപ്പോൾ Active ആയ ക്യാമ്പെയിനുകളും ഇതിനകം അവസാനിച്ചവയും കാണാൻ സ്റ്റാറ്റസ് അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക.",
      },
      {
        targetPath: "/campaigns",
        targetSelector: '[data-tour-id="tour-campaigns-import"]',
        explanationEn: "Import lets you bulk-load campaign records from a spreadsheet, rather than adding each one manually.",
        explanationMl: "ഓരോന്നും സ്വമേധയാ ചേർക്കുന്നതിന് പകരം ഒരു സ്പ്രെഡ്ഷീറ്റിൽ നിന്ന് ക്യാമ്പെയിൻ റെക്കോർഡുകൾ ബൾക്കായി ലോഡ് ചെയ്യാൻ Import സഹായിക്കുന്നു.",
      },
    ],
  },
  {
    title: "Employees (HR)",
    description: "The employee directory and records — for HR and managers.",
    steps: [
      {
        targetPath: "/hrms/employees",
        targetSelector: '[data-tour-id="tour-employees-header"]',
        explanationEn: "This is the full employee directory — personal details, employment info, salary structure, and documents, all in one record per person.",
        explanationMl: "ഇത് പൂർണ്ണമായ ജീവനക്കാരുടെ ഡയറക്ടറിയാണ് — വ്യക്തിഗത വിവരങ്ങൾ, തൊഴിൽ വിവരങ്ങൾ, ശമ്പള ഘടന, രേഖകൾ, ഇവയെല്ലാം ഓരോ വ്യക്തിക്കും ഒരു റെക്കോർഡിൽ.",
      },
      {
        targetPath: "/hrms/employees",
        targetSelector: '[data-tour-id="tour-employees-add"]',
        explanationEn: "Add Employee creates a new record and automatically sends them a branded welcome email. Link their login account here too, so their My HR data connects correctly.",
        explanationMl: "Add Employee ഒരു പുതിയ റെക്കോർഡ് ഉണ്ടാക്കുകയും സ്വയമേവ അവർക്ക് ഒരു ബ്രാൻഡഡ് വെൽക്കം ഇമെയിൽ അയക്കുകയും ചെയ്യുന്നു. അവരുടെ My HR ഡാറ്റ ശരിയായി ബന്ധിപ്പിക്കാൻ ഇവിടെ അവരുടെ ലോഗിൻ അക്കൗണ്ടും ലിങ്ക് ചെയ്യുക.",
        quiz: {
          questionEn: "What happens automatically when you add a new employee?",
          questionMl: "ഒരു പുതിയ ജീവനക്കാരനെ ചേർക്കുമ്പോൾ എന്താണ് സ്വയമേവ സംഭവിക്കുന്നത്?",
          options: [
            { en: "Nothing extra happens", ml: "അധികമായി ഒന്നും സംഭവിക്കില്ല" },
            { en: "They get a welcome email and the team is notified", ml: "അവർക്ക് ഒരു വെൽക്കം ഇമെയിൽ ലഭിക്കുകയും ടീമിനെ അറിയിക്കുകയും ചെയ്യുന്നു" },
            { en: "Their salary is set to zero", ml: "അവരുടെ ശമ്പളം പൂജ്യമായി സെറ്റ് ചെയ്യപ്പെടുന്നു" },
          ],
          correctIndex: 1,
        },
      },
      {
        targetPath: "/hrms/employees",
        targetSelector: '[data-tour-id="tour-employees-stats"]',
        explanationEn: "These tiles break down headcount by status — Active, On Probation, Inactive — a quick read on overall team composition.",
        explanationMl: "സ്റ്റാറ്റസ് അനുസരിച്ച് ജീവനക്കാരുടെ എണ്ണം ഈ ടൈലുകൾ വിഭജിക്കുന്നു — Active, On Probation, Inactive — മൊത്തം ടീം ഘടനയുടെ വേഗത്തിലുള്ള ധാരണ.",
      },
      {
        targetPath: "/hrms/employees",
        targetSelector: '[data-tour-id="tour-employees-filters"]',
        explanationEn: "Filter the directory by department to quickly find everyone on a specific team.",
        explanationMl: "ഒരു നിശ്ചിത ടീമിലെ എല്ലാവരെയും വേഗത്തിൽ കണ്ടെത്താൻ ഡിപ്പാർട്ട്മെന്റ് അനുസരിച്ച് ഡയറക്ടറി ഫിൽട്ടർ ചെയ്യുക.",
      },
      {
        targetPath: "/hrms/employees",
        targetSelector: '[data-tour-id="tour-employees-import"]',
        explanationEn: "Import lets HR bulk-onboard a whole batch of employee records from a spreadsheet — much faster than adding people one at a time during a big hiring round.",
        explanationMl: "ഒരു വലിയ റിക്രൂട്ട്മെന്റ് റൗണ്ടിൽ ഓരോരുത്തരെയും ഒറ്റയായി ചേർക്കുന്നതിനേക്കാൾ വേഗത്തിൽ, ഒരു സ്പ്രെഡ്ഷീറ്റിൽ നിന്ന് ജീവനക്കാരുടെ ഒരു ബാച്ച് മുഴുവൻ ബൾക്കായി ഓൺബോർഡ് ചെയ്യാൻ Import HR-നെ സഹായിക്കുന്നു.",
      },
    ],
  },
  {
    title: "Sales Team Performance",
    description: "Team-wide leaderboard for sales managers.",
    steps: [
      {
        targetPath: "/sales-team",
        targetSelector: '[data-tour-id="tour-salesteam-header"]',
        explanationEn: "Sales Team Performance is the manager's view — every rep's leads, conversion rate, revenue, and estimated incentive, side by side.",
        explanationMl: "മാനേജരുടെ കാഴ്ചയാണ് Sales Team Performance — ഓരോ പ്രതിനിധിയുടെയും ലീഡുകൾ, കൺവേർഷൻ നിരക്ക്, വരുമാനം, കണക്കാക്കിയ ഇൻസെന്റീവ്, എല്ലാം ഒരുമിച്ച്.",
      },
      {
        targetPath: "/sales-team",
        targetSelector: '[data-tour-id="tour-salesteam-refresh"]',
        explanationEn: "Use the month selector to look back at past performance, and Refresh to pull the latest numbers after new activity comes in.",
        explanationMl: "മുൻകാല പ്രകടനം തിരിഞ്ഞുനോക്കാൻ മാസം തിരഞ്ഞെടുക്കൽ ഉപയോഗിക്കുക, പുതിയ പ്രവർത്തനം വന്നതിന് ശേഷം ഏറ്റവും പുതിയ കണക്കുകൾ ലഭിക്കാൻ Refresh ചെയ്യുക.",
      },
    ],
  },
  {
    title: "HR Admin",
    description: "The HR admin dashboard — employees, attendance, leave, payroll, and more.",
    steps: [
      {
        targetPath: "/hrms-admin",
        targetSelector: '[data-tour-id="tour-hrshell-header"]',
        explanationEn: "HR Admin is HR's command center — a tabbed shell covering employees, attendance, leave requests, payroll, recruitment, and performance reviews.",
        explanationMl: "HR-ന്റെ കമാൻഡ് സെന്ററാണ് HR Admin — ജീവനക്കാർ, ഹാജർ, അവധി അപേക്ഷകൾ, ശമ്പളം, റിക്രൂട്ട്മെന്റ്, പ്രകടന അവലോകനങ്ങൾ എന്നിവ ഉൾക്കൊള്ളുന്ന ടാബ് ഷെൽ.",
      },
      {
        targetPath: "/hrms-admin",
        targetSelector: '[data-tour-id="tour-hrshell-nav"]',
        explanationEn: "Use the tabs on the side (or top, on mobile) to switch sections — each one has its own stat cards and list, same pattern throughout the app.",
        explanationMl: "വിഭാഗങ്ങൾ മാറാൻ വശത്തുള്ള (മൊബൈലിൽ മുകളിലുള്ള) ടാബുകൾ ഉപയോഗിക്കുക — ഓരോന്നിനും അതിന്റേതായ സ്റ്റാറ്റ് കാർഡുകളും ലിസ്റ്റും ഉണ്ട്, ആപ്പിലുടനീളം ഒരേ രീതി.",
      },
    ],
  },
  {
    title: "Reports",
    description: "Generate and export reports across HR, attendance, payroll, and recruitment.",
    steps: [
      {
        targetPath: "/reports",
        targetSelector: '[data-tour-id="tour-reports-header"]',
        explanationEn: "Reports pulls together data across the app into exportable summaries — useful for board meetings, audits, or just sanity-checking the numbers.",
        explanationMl: "ആപ്പിലുടനീളമുള്ള ഡാറ്റ എക്സ്പോർട്ട് ചെയ്യാവുന്ന സംഗ്രഹങ്ങളായി ഒരുമിച്ച് കൊണ്ടുവരുന്നു Reports — ബോർഡ് മീറ്റിംഗുകൾ, ഓഡിറ്റുകൾ, അല്ലെങ്കിൽ കണക്കുകൾ പരിശോധിക്കാൻ ഉപകാരപ്രദം.",
      },
      {
        targetPath: "/reports",
        targetSelector: '[data-tour-id="tour-reports-header"]',
        explanationEn: "Pick a report type, then export as CSV/Excel for spreadsheets or PDF for sharing/printing.",
        explanationMl: "ഒരു റിപ്പോർട്ട് തരം തിരഞ്ഞെടുക്കുക, എന്നിട്ട് സ്പ്രെഡ്ഷീറ്റുകൾക്കായി CSV/Excel ആയോ പങ്കിടാൻ/പ്രിന്റ് ചെയ്യാൻ PDF ആയോ എക്സ്പോർട്ട് ചെയ്യുക.",
      },
    ],
  },
  {
    title: "Admin Settings",
    description: "Users, offices, and third-party integrations — for Admin/Super Admin.",
    steps: [
      {
        targetPath: "/admin",
        targetSelector: '[data-tour-id="tour-hrshell-header"]',
        explanationEn: "Admin is where Admin/Super Admin manage the system itself — user accounts, office locations, role permissions, and integrations like email and WhatsApp.",
        explanationMl: "Admin/Super Admin സിസ്റ്റം തന്നെ കൈകാര്യം ചെയ്യുന്നിടമാണ് Admin — ഉപയോക്തൃ അക്കൗണ്ടുകൾ, ഓഫീസ് സ്ഥലങ്ങൾ, റോൾ അനുമതികൾ, ഇമെയിൽ, WhatsApp പോലുള്ള ഇന്റഗ്രേഷനുകൾ.",
      },
      {
        targetPath: "/admin",
        targetSelector: '[data-tour-id="tour-hrshell-nav"]',
        explanationEn: "The Integrations tab is where API keys for email, AI, and WhatsApp get configured — including the Google Cloud TTS key that powers this very training voiceover.",
        explanationMl: "ഇമെയിൽ, AI, WhatsApp എന്നിവയ്ക്കുള്ള API കീകൾ ക്രമീകരിക്കുന്നത് Integrations ടാബിലാണ് — ഈ ട്രെയിനിംഗ് വോയ്സ്ഓവർ പ്രവർത്തിപ്പിക്കുന്ന Google Cloud TTS കീ ഉൾപ്പെടെ.",
        quiz: {
          questionEn: "Where do you configure API keys like the Google Cloud TTS key?",
          questionMl: "Google Cloud TTS കീ പോലുള്ള API കീകൾ എവിടെയാണ് ക്രമീകരിക്കുന്നത്?",
          options: [
            { en: "Admin → Integrations", ml: "Admin → Integrations" },
            { en: "My HR", ml: "My HR" },
            { en: "Reports", ml: "Reports" },
          ],
          correctIndex: 0,
        },
      },
    ],
  },
  {
    title: "Team Space (Chat)",
    description: "The built-in team chat — channels, DMs, and announcements.",
    steps: [
      {
        targetPath: "/dashboard",
        targetSelector: '[data-tour-id="tour-teamspace-open"]',
        explanationEn: "Team Space is Wanago's built-in chat, right inside the ERP — no need for a separate app. Click this icon from anywhere to open it.",
        explanationMl: "Wanago-യുടെ ബിൽറ്റ്-ഇൻ ചാറ്റാണ് Team Space, ERP-ക്ക് ഉള്ളിൽ തന്നെ — വേറെ ആപ്പ് ആവശ്യമില്ല. എവിടെ നിന്നും ഈ ഐക്കൺ ക്ലിക്ക് ചെയ്ത് തുറക്കാം.",
      },
      {
        targetPath: "/dashboard",
        targetSelector: '[data-tour-id="tour-teamspace-open"]',
        explanationEn: "Channels can be company-wide or restricted to just your department. Direct Messages show a green dot when a teammate is online. You can attach files, record voice messages, and react with emoji.",
        explanationMl: "ചാനലുകൾ കമ്പനി-വ്യാപകമോ നിങ്ങളുടെ ഡിപ്പാർട്ട്മെന്റിന് മാത്രമോ ആകാം. ഒരു സഹപ്രവർത്തകൻ ഓൺലൈനാകുമ്പോൾ Direct Messages-ൽ ഒരു പച്ച ഡോട്ട് കാണിക്കും. ഫയലുകൾ അറ്റാച്ച് ചെയ്യാം, വോയ്സ് സന്ദേശങ്ങൾ റെക്കോർഡ് ചെയ്യാം, ഇമോജി ഉപയോഗിച്ച് പ്രതികരിക്കാം.",
      },
    ],
  },
];
