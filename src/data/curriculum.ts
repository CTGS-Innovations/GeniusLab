/**
 * Massachusetts Curriculum Framework alignment for each skill.
 *
 * Every standard below was checked against the official DESE framework PDFs
 * (see SOURCES). Excerpts are quoted from those documents, sometimes trimmed.
 * "Also called" terms are the everyday names teachers use; some (e.g. PEMDAS,
 * comma splice, hook) are classroom vocabulary rather than framework wording.
 */
export interface StandardRef {
  code: string;
  framework: 'MA Math 2017' | 'MA ELA 2017' | 'MA STE 2016';
  /** Where it sits: a model course, grade band, or practice. */
  where: string;
  text: string;
  url: string;
}

export interface Alignment {
  /** Short grade/course label shown on skills, e.g. "Algebra I · Gr 9". */
  grade: string;
  /** Earlier grade where the foundation is first taught, if any. */
  foundation?: string;
  standards: StandardRef[];
  terms: string[];
}

const MATH = 'https://www.doe.mass.edu/frameworks/math/2017-06.pdf';
const ELA = 'https://www.doe.mass.edu/frameworks/ela/2017-06.pdf';
const STE = 'https://www.doe.mass.edu/frameworks/scitech/2016-04.pdf';

export const SOURCES = [
  { name: '2017 Massachusetts Curriculum Framework for Mathematics', url: MATH },
  { name: '2017 Massachusetts Curriculum Framework for English Language Arts and Literacy', url: ELA },
  { name: '2016 Massachusetts Science and Technology/Engineering Curriculum Framework', url: STE },
];

export const ALIGNMENT: Record<string, Alignment> = {
  // ---------- Math ----------
  'm-order': {
    grade: 'Algebra I · Gr 9',
    foundation: 'Grades 5–6',
    standards: [
      { code: '6.EE.A.2c', framework: 'MA Math 2017', where: 'Grade 6', url: `${MATH}#page=58`,
        text: 'Perform arithmetic operations, including those involving whole-number exponents, in the conventional order when there are no parentheses to specify a particular order (Order of Operations).' },
      { code: 'AI.A-SSE.A.1', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=110`,
        text: 'Interpret parts of an expression, such as terms, factors, and coefficients.' },
    ],
    terms: ['Order of operations', 'PEMDAS', 'GEMDAS', 'BEDMAS', 'Grouping symbols', 'Evaluate the expression'],
  },
  'm-inverse': {
    grade: 'Algebra I · Gr 9',
    foundation: 'Grades 7–8',
    standards: [
      { code: 'AI.A-REI.A.1', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=111`,
        text: 'Explain each step in solving a simple equation as following from the equality of numbers asserted at the previous step…' },
      { code: 'AI.A-REI.B.3', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=111`,
        text: 'Solve linear equations and inequalities in one variable, including equations with coefficients represented by letters.' },
      { code: '8.EE.C.7b', framework: 'MA Math 2017', where: 'Grade 8', url: `${MATH}#page=69`,
        text: 'Solve linear equations with rational number coefficients, including equations whose solutions require expanding expressions using the distributive property and collecting like terms.' },
    ],
    terms: ['Inverse operations', 'Isolate the variable', 'Properties of equality', 'Balance model', 'Two-step equations', 'Variables on both sides'],
  },
  'm-word': {
    grade: 'Algebra I · Gr 9',
    foundation: 'Grade 7',
    standards: [
      { code: 'AI.A-CED.A.1', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=111`,
        text: 'Create equations and inequalities in one variable and use them to solve problems.' },
      { code: 'SMP 4', framework: 'MA Math 2017', where: 'Standards for Mathematical Practice', url: `${MATH}#page=16`,
        text: 'Model with mathematics: identify important quantities in a practical situation and map their relationships.' },
      { code: '7.EE.B.4', framework: 'MA Math 2017', where: 'Grade 7', url: `${MATH}#page=64`,
        text: 'Use variables to represent quantities in a real-world or mathematical problem, and construct simple equations and inequalities to solve problems.' },
    ],
    terms: ['Translate words into algebra', 'Define the variable', 'Key words', 'Mathematical modeling', 'Units / dimensional analysis', 'Reasonableness check'],
  },
  'm-multistep': {
    grade: 'Algebra I · Gr 9',
    foundation: 'Grade 7',
    standards: [
      { code: 'AI.N-Q.A.1', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=110`,
        text: 'Use units as a way to understand problems and to guide the solution of multi-step problems.' },
      { code: 'AI.A-REI.C.6', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=111`,
        text: 'Solve systems of linear equations exactly and approximately…' },
      { code: 'SMP 1', framework: 'MA Math 2017', where: 'Standards for Mathematical Practice', url: `${MATH}#page=16`,
        text: 'Make sense of problems and persevere in solving them.' },
    ],
    terms: ['Multi-step problems', 'Problem-solving plan', 'Unit rate', 'Systems of equations', 'Substitution', 'Check your answer'],
  },
  'm-errors': {
    grade: 'Algebra I · Gr 9',
    foundation: 'Grade 7',
    standards: [
      { code: 'SMP 3', framework: 'MA Math 2017', where: 'Standards for Mathematical Practice', url: `${MATH}#page=16`,
        text: 'Distinguish correct logic or reasoning from that which is flawed, and—if there is a flaw in an argument—explain what it is.' },
      { code: 'AI.A-APR.A.1b', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=111`,
        text: 'Factor and/or expand polynomial expressions, identify and combine like terms, and apply the Distributive property.' },
      { code: 'AI.A-REI.B.4b', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=111`,
        text: 'Solve quadratic equations by inspection (e.g., for x² = 49), taking square roots…' },
    ],
    terms: ['Error analysis', 'Critique the reasoning', 'Distribute the negative', 'Flip the inequality sign', 'Plus-or-minus (±)', 'Common misconceptions'],
  },
  'm-rules': {
    grade: 'Algebra I · Gr 9',
    foundation: 'Grades 6–8',
    standards: [
      { code: '8.EE.A.1', framework: 'MA Math 2017', where: 'Grade 8', url: `${MATH}#page=69`,
        text: 'Know and apply the properties of integer exponents to generate equivalent numerical expressions.' },
      { code: 'AI.A-SSE.A.2', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=110`,
        text: 'Use the structure of an expression to identify ways to rewrite it.' },
      { code: 'AI.A-SSE.B.3a', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=110`,
        text: 'Factor a quadratic expression to reveal the zeros of the function it defines.' },
    ],
    terms: ['Properties of operations', 'Laws of exponents', 'Equivalent expressions', 'Difference of squares', 'Factoring trinomials', 'Log rules (Precalculus)'],
  },
  'm-functions': {
    grade: 'Algebra I → Algebra II · Gr 9–11',
    foundation: 'Grade 8',
    standards: [
      { code: 'AI.F-IF.A.2', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=112`,
        text: 'Use function notation, evaluate functions for inputs in their domains, and interpret statements that use function notation in terms of a context.' },
      { code: 'AI.F-LE.A.1', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=113`,
        text: 'Distinguish between situations that can be modeled with linear functions and with exponential functions.' },
      { code: 'AI.F-BF.B.3', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=113`,
        text: 'Identify the effect on the graph of replacing f(x) by f(x) + k, kf(x), f(kx), and f(x + k)…' },
    ],
    terms: ['Function notation', 'Slope-intercept form', 'Rate of change', 'Vertex form', 'Zeros / roots / x-intercepts', 'Transformations'],
  },

  // ---------- English ----------
  'e-parts': {
    grade: 'Grades 9–10',
    foundation: 'Grades 4–6',
    standards: [
      { code: 'L.4.1a', framework: 'MA ELA 2017', where: 'Grade 4 (carries through Grade 12)', url: `${ELA}#page=63`,
        text: 'Produce complete sentences, using knowledge of subject and predicate to recognize and correct inappropriate sentence fragments and run-on sentences.' },
      { code: 'L.9-10.1b', framework: 'MA ELA 2017', where: 'Grades 9–10', url: `${ELA}#page=112`,
        text: 'Use various types of phrases (noun, verb, adjectival, participial, prepositional) and clauses (independent, dependent, noun, relative, adverbial)…' },
    ],
    terms: ['Parts of speech', 'Subject and predicate', 'Simple subject', 'Prepositional phrase', 'Gerund', 'Independent clause'],
  },
  'e-grammar': {
    grade: 'Grades 9–10',
    foundation: 'Grades 3–4',
    standards: [
      { code: 'L.3.1b', framework: 'MA ELA 2017', where: 'Grade 3 (carries through Grade 12)', url: `${ELA}#page=55`,
        text: 'Ensure subject-verb and pronoun-antecedent agreement.' },
      { code: 'L.4.1b', framework: 'MA ELA 2017', where: 'Grade 4', url: `${ELA}#page=63`,
        text: 'Correctly use frequently confused words (e.g., their/there).' },
      { code: 'L.9-10.2a', framework: 'MA ELA 2017', where: 'Grades 9–10', url: `${ELA}#page=112`,
        text: 'Use a semicolon (and perhaps a conjunctive adverb) to link two or more closely related independent clauses.' },
    ],
    terms: ['Subject–verb agreement', 'Pronoun–antecedent agreement', 'Commonly confused words', 'Comma splice', 'Run-on sentence', 'Conventions'],
  },
  'e-structure': {
    grade: 'Grades 9–10',
    standards: [
      { code: 'W.9-10.1c', framework: 'MA ELA 2017', where: 'Grades 9–10', url: `${ELA}#page=109`,
        text: 'Use words, phrases, and clauses to link the major sections of the text… between claim(s) and reasons, between reasons and evidence, and between claim(s) and counterclaims.' },
      { code: 'W.9-10.9', framework: 'MA ELA 2017', where: 'Grades 9–10', url: `${ELA}#page=110`,
        text: 'Draw evidence from literary or informational texts to support written analysis, interpretation, reflection, and research.' },
    ],
    terms: ['Topic sentence', 'Claim–evidence–reasoning (CER)', 'Analysis / commentary', 'Transitions', 'Counterclaim', 'PEEL paragraph'],
  },
  'e-clarity': {
    grade: 'Grades 9–12',
    foundation: 'Grades 6–8',
    standards: [
      { code: 'L.6.1c', framework: 'MA ELA 2017', where: 'Grade 6 (carries through Grade 12)', url: `${ELA}#page=94`,
        text: 'Place or rearrange phrases and clauses within a sentence, recognizing and correcting misplaced and dangling modifiers.' },
      { code: 'L.7.1b', framework: 'MA ELA 2017', where: 'Grade 7 (carries through Grade 12)', url: `${ELA}#page=101`,
        text: 'Recognize and correct vague pronouns (those that have unclear or ambiguous antecedents).' },
      { code: 'L.9-10.3b', framework: 'MA ELA 2017', where: 'Grades 9–10', url: `${ELA}#page=112`,
        text: 'Revise and edit work to decrease redundancy (ineffective repetition of ideas or details).' },
    ],
    terms: ['Dangling modifier', 'Misplaced modifier', 'Vague pronoun', 'Wordiness / redundancy', 'Active vs. passive voice', 'Concise writing'],
  },
  'e-openings': {
    grade: 'Grades 9–12',
    standards: [
      { code: 'W.9-10.1a', framework: 'MA ELA 2017', where: 'Grades 9–10', url: `${ELA}#page=109`,
        text: 'Introduce precise claim(s), distinguish the claim(s) from alternate or opposing claims…' },
      { code: 'W.11-12.1a', framework: 'MA ELA 2017', where: 'Grades 11–12', url: `${ELA}#page=116`,
        text: 'Introduce precise, knowledgeable claim(s), establish the significance of the claim(s)…' },
    ],
    terms: ['Hook / lead', 'Thesis statement', 'Arguable claim', 'Counterclaim', 'Funnel introduction', 'Background / context'],
  },
  'e-revise': {
    grade: 'Grades 9–12',
    foundation: 'Grade 4',
    standards: [
      { code: 'W.9-10.5', framework: 'MA ELA 2017', where: 'Grades 9–10', url: `${ELA}#page=110`,
        text: 'Develop and strengthen writing as needed by planning, revising, editing, rewriting, or trying a new approach…' },
      { code: 'W.9-10.1e', framework: 'MA ELA 2017', where: 'Grades 9–10', url: `${ELA}#page=109`,
        text: 'Provide a concluding statement or section that follows from and supports the argument presented.' },
      { code: 'L.4.3a', framework: 'MA ELA 2017', where: 'Grade 4 (carries through Grade 12)', url: `${ELA}#page=64`,
        text: 'Choose words and phrases to convey ideas precisely.' },
    ],
    terms: ['Revising vs. editing', 'ARMS / CUPS', 'Precise word choice', 'Strong verbs', 'Sentence variety', 'Conclusion: “so what?”'],
  },

  // ---------- Science ----------
  's-variables': {
    grade: 'High school · Gr 9–12',
    foundation: 'Grades 6–8',
    standards: [
      { code: 'SEP 3 (9–12)', framework: 'MA STE 2016', where: 'Science & Engineering Practice: Planning and Carrying Out Investigations', url: `${STE}#page=98`,
        text: 'Make directional hypotheses that specify what happens to a dependent variable when an independent variable is manipulated.' },
      { code: 'SEP 3 (9–12)', framework: 'MA STE 2016', where: 'Science & Engineering Practice: Planning and Carrying Out Investigations', url: `${STE}#page=98`,
        text: 'Consider possible confounding variables or effects and evaluate the investigation’s design to ensure that variables are controlled.' },
    ],
    terms: ['Independent (manipulated) variable', 'Dependent (responding) variable', 'Controlled variables / constants', 'Control group', 'Confounding variable', 'Fair test'],
  },
  's-hypothesis': {
    grade: 'High school · Gr 9–12',
    foundation: 'Grades 6–8',
    standards: [
      { code: 'SEP 1 (9–12)', framework: 'MA STE 2016', where: 'Science & Engineering Practice: Asking Questions and Defining Problems', url: `${STE}#page=98`,
        text: 'Evaluate a question to determine if it is testable and relevant.' },
      { code: 'Cause and Effect (9–12)', framework: 'MA STE 2016', where: 'Crosscutting Concept', url: `${STE}#page=158`,
        text: 'Empirical evidence is required to differentiate between cause and correlation and to make claims about specific causes and effects.' },
      { code: 'AI.S-ID.C.9', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=114`,
        text: 'Distinguish between correlation and causation.' },
    ],
    terms: ['Testable hypothesis', 'If… then… because…', 'Claim–evidence–reasoning (CER)', 'Observation vs. inference', 'Theory vs. law', 'Correlation vs. causation'],
  },
  's-design': {
    grade: 'High school · Gr 9–12',
    foundation: 'Grades 3–8',
    standards: [
      { code: 'SEP 3 (9–12)', framework: 'MA STE 2016', where: 'Science & Engineering Practice: Planning and Carrying Out Investigations', url: `${STE}#page=98`,
        text: 'Decide on the types, quantity, and accuracy of data needed to produce reliable measurements; consider limitations on the precision of the data (e.g., number of trials…).' },
      { code: 'AII.S-IC.B.3', framework: 'MA Math 2017', where: 'Algebra II', url: `${MATH}#page=128`,
        text: 'Recognize the purposes of and differences among sample surveys, experiments, and observational studies; explain how randomization relates to each.' },
    ],
    terms: ['Fair test', 'Repeated trials', 'Sample size', 'Random assignment', 'Control group / placebo', 'Blind study'],
  },
  's-cause': {
    grade: 'Chemistry & Intro Physics · Gr 9–10',
    foundation: 'Grades 7–8',
    standards: [
      { code: 'HS-PS1-5', framework: 'MA STE 2016', where: 'High school Chemistry', url: `${STE}#page=86`,
        text: 'Construct an explanation based on kinetic molecular theory for why varying conditions influence the rate of a chemical reaction or a dissolving process.' },
      { code: 'HS-PS2-10(MA)', framework: 'MA STE 2016', where: 'High school Introductory Physics', url: `${STE}#page=91`,
        text: 'Use free-body force diagrams, algebraic expressions, and Newton’s laws of motion to predict changes to velocity and acceleration…' },
      { code: '8.MS-PS1-2', framework: 'MA STE 2016', where: 'Grade 8', url: `${STE}#page=69`,
        text: 'Analyze and interpret data on the properties of substances before and after the substances interact to determine if a chemical reaction has occurred.' },
    ],
    terms: ['Evidence of chemical change', 'Reaction rate factors', 'Collision theory', 'Net force', 'Newton’s laws', 'Friction'],
  },
  's-data': {
    grade: 'High school · Gr 9–12',
    foundation: 'Grades 6–8',
    standards: [
      { code: 'SEP 4 (9–12)', framework: 'MA STE 2016', where: 'Science & Engineering Practice: Analyzing and Interpreting Data', url: `${STE}#page=98`,
        text: 'Apply concepts of statistics and probability (including determining function fits to data, slope, intercept, and correlation coefficient for linear fits)…' },
      { code: 'AI.S-ID.A.3', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=113`,
        text: 'Interpret differences in shape, center, and spread in the context of the data sets, accounting for possible effects of extreme data points (outliers).' },
      { code: 'AI.N-Q.A.1', framework: 'MA Math 2017', where: 'Algebra I', url: `${MATH}#page=110`,
        text: 'Choose and interpret the scale and the origin in graphs and data displays.' },
    ],
    terms: ['Trend / pattern', 'Outlier', 'Line of best fit', 'Axes and scale', 'Misleading graphs', 'TAILS checklist'],
  },
  's-next': {
    grade: 'High school · Gr 11–12',
    standards: [
      { code: 'SEP 6 (9–12)', framework: 'MA STE 2016', where: 'Science & Engineering Practice: Constructing Explanations', url: `${STE}#page=98`,
        text: 'Construct and revise an explanation based on valid and reliable evidence obtained from a variety of sources (including students’ own investigations… peer review).' },
      { code: 'Nature of Science', framework: 'MA STE 2016', where: 'Appendix VIII', url: `${STE}#page=162`,
        text: 'Scientific knowledge is open to revision in light of new evidence.' },
    ],
    terms: ['Cycle of investigation', 'Replication', 'Peer review', 'Revise the hypothesis', 'Refine the design', 'Communicate results'],
  },
};

export interface Milestone {
  level: string;
  /** Framework domain or strand names, in the framework's own words. */
  domains: string[];
  /** App skills that build this level. */
  skills: string[];
}

/**
 * Grade-by-grade ladder per lab. Math follows MA's Traditional Pathway model
 * courses; ELA follows the framework's grade bands. Science course order varies
 * by district (the framework names grades 9–10 introductory and 11–12 upper-level
 * courses), so the science ladder is grouped that way.
 */
export const MILESTONES: Record<'math' | 'english' | 'science', { note?: string; levels: Milestone[] }> = {
  math: {
    note: 'Traditional Pathway model courses (2017 MA Math Framework).',
    levels: [
      { level: 'Foundations · Grades 5–8', domains: ['Operations and Algebraic Thinking (OA)', 'Expressions and Equations (EE)', 'Functions (F)'], skills: ['m-order', 'm-inverse', 'm-rules'] },
      { level: 'Algebra I · Grade 9', domains: ['A-SSE Seeing Structure in Expressions', 'A-CED Creating Equations', 'A-REI Reasoning with Equations and Inequalities', 'F-IF Interpreting Functions', 'F-LE Linear, Quadratic, and Exponential Models', 'N-Q Quantities'], skills: ['m-word', 'm-multistep', 'm-errors', 'm-functions'] },
      { level: 'Geometry · Grade 10', domains: ['G-CO Congruence', 'G-SRT Similarity, Right Triangles, and Trigonometry', 'G-GPE Expressing Geometric Properties with Equations', 'G-MG Modeling with Geometry'], skills: [] },
      { level: 'Algebra II · Grade 11', domains: ['A-APR Arithmetic with Polynomials and Rational Expressions', 'F-BF Building Functions', 'S-IC Making Inferences and Justifying Conclusions', 'N-CN The Complex Number System'], skills: ['m-functions'] },
      { level: 'Precalculus · Grade 12', domains: ['F-BF Building Functions (inverse functions, logarithms)', 'F-TF Trigonometric Functions', 'N-VM Vector and Matrix Quantities'], skills: [] },
    ],
  },
  english: {
    note: 'Grade bands from the 2017 MA ELA/Literacy Framework.',
    levels: [
      { level: 'Foundations · Grades 3–8', domains: ['Language: Conventions of Standard English (agreement, fragments and run-ons, modifiers, vague pronouns)'], skills: ['e-parts', 'e-grammar', 'e-clarity'] },
      { level: 'Grade 9', domains: ['Language: Conventions of Standard English', 'Writing: Text Types and Purposes (argument: claims and counterclaims)', 'Writing: Research to Build and Present Knowledge'], skills: ['e-structure', 'e-openings'] },
      { level: 'Grade 10', domains: ['Language: Knowledge of Language (decrease redundancy)', 'Writing: Production and Distribution of Writing (planning, revising, editing)'], skills: ['e-clarity', 'e-revise'] },
      { level: 'Grade 11', domains: ['Writing: Text Types and Purposes (knowledgeable claims, significance)', 'Language: Knowledge of Language (vary syntax)'], skills: ['e-openings', 'e-revise'] },
      { level: 'Grade 12', domains: ['Language: Knowledge of Language (concise and cohesive)', 'Writing: Research to Build and Present Knowledge'], skills: ['e-revise'] },
    ],
  },
  science: {
    note: 'Course order varies by district. The framework names grades 9–10 introductory and 11–12 upper-level courses.',
    levels: [
      { level: 'Foundations · Grades 6–8', domains: ['SEP 3 Planning and Carrying Out Investigations (identify independent and dependent variables and controls)'], skills: ['s-variables'] },
      { level: 'Introductory courses · Grades 9–10', domains: ['PS1 Matter and Its Interactions (Chemistry)', 'PS2 Motion and Stability: Forces and Interactions (Introductory Physics)', 'SEP 1 Asking Questions', 'SEP 3 Planning and Carrying Out Investigations'], skills: ['s-hypothesis', 's-design', 's-cause'] },
      { level: 'Upper-level courses · Grades 11–12', domains: ['SEP 4 Analyzing and Interpreting Data', 'SEP 6 Constructing Explanations', 'SEP 7 Engaging in Argument from Evidence', 'Nature of Science'], skills: ['s-data', 's-next'] },
    ],
  },
};
