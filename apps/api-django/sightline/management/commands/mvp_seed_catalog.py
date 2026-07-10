"""Realistic MVP catalog: 10 courses with units, materials, and 5–7 question exams."""

from __future__ import annotations

from typing import Any

MVP_STUDENT_COUNT = 12

MVP_COURSE_SPECS: list[dict[str, Any]] = [
    {
        "code": "CSE-321",
        "title": "Algorithms",
        "dept": "CSE",
        "teacher_key": "teacher",
        "units": [
            {
                "title": "Asymptotic analysis",
                "summary": "Big-O, Big-Theta, and growth-rate reasoning for iterative algorithms.",
                "focus": "Students compare nested loops, divide-and-conquer recurrences, and justify worst-case bounds.",
            },
            {
                "title": "Graph algorithms",
                "summary": "BFS, DFS, shortest paths, and spanning trees on weighted graphs.",
                "focus": "Students trace queues/stacks, prove correctness sketches, and choose algorithms by graph density.",
            },
            {
                "title": "Dynamic programming",
                "summary": "Memoization and tabulation for overlapping subproblems.",
                "focus": "Students define states, transitions, and base cases for classic DP patterns.",
            },
        ],
        "exam_title": "Algorithms Midterm Quiz",
        "exam_questions": [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "Which notation describes an upper bound that may be loose but still valid?",
                "options": ["Big-O", "Big-Omega", "Big-Theta", "Little-o only"],
            },
            {
                "id": "q2",
                "kind": "single_choice",
                "prompt": "BFS on an unweighted graph finds what kind of paths from the source?",
                "options": ["Shortest paths by edge count", "Minimum spanning trees", "Maximum flows", "Euler tours"],
            },
            {
                "id": "q3",
                "kind": "short_answer",
                "prompt": "State the two main requirements for a problem to be solved with dynamic programming.",
            },
            {
                "id": "q4",
                "kind": "single_choice",
                "prompt": "Dijkstra's algorithm fails with negative edge weights because it assumes what property?",
                "options": [
                    "Once a node is settled its distance is final",
                    "All nodes have equal degree",
                    "The graph is a tree",
                    "Edges are undirected",
                ],
            },
            {
                "id": "q5",
                "kind": "short_answer",
                "prompt": "Give one difference between memoization and bottom-up tabulation.",
            },
            {
                "id": "q6",
                "kind": "single_choice",
                "prompt": "Kruskal's algorithm builds an MST by repeatedly taking what?",
                "options": ["Lightest safe edge", "Highest-degree vertex", "Longest path", "Random edge"],
            },
        ],
    },
    {
        "code": "CSE-335",
        "title": "Database Systems",
        "dept": "CSE",
        "teacher_key": "teacher2",
        "units": [
            {
                "title": "Relational model",
                "summary": "Tables, keys, functional dependencies, and normalization to 3NF.",
                "focus": "Students map ER diagrams to schemas and explain update anomalies.",
            },
            {
                "title": "SQL querying",
                "summary": "SELECT, JOIN, aggregation, subqueries, and indexing basics.",
                "focus": "Students write readable queries and explain when indexes help.",
            },
            {
                "title": "Transactions",
                "summary": "ACID properties, isolation levels, and concurrency control.",
                "focus": "Students reason about dirty reads, deadlocks, and commit boundaries.",
            },
        ],
        "exam_title": "Database Systems Quiz",
        "exam_questions": [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "Which SQL clause filters grouped rows after aggregation?",
                "options": ["HAVING", "WHERE", "ORDER BY", "DISTINCT"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "Name two ACID properties and explain one in a sentence.",
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "A foreign key enforces what?",
                "options": ["Referential integrity", "Index uniqueness only", "Row-level encryption", "Query caching"],
            },
            {
                "id": "q4",
                "kind": "single_choice",
                "prompt": "Which normal form removes transitive dependencies on non-key attributes?",
                "options": ["3NF", "1NF", "BCNF only for all tables", "Unnormalized"],
            },
            {
                "id": "q5",
                "kind": "short_answer",
                "prompt": "Why can a B-tree index speed up range queries on an indexed column?",
            },
            {
                "id": "q6",
                "kind": "single_choice",
                "prompt": "In a LEFT JOIN, unmatched rows from the left table appear with what?",
                "options": ["NULLs on the right side", "Duplicate keys", "Automatic deletion", "Inner matches only"],
            },
            {
                "id": "q7",
                "kind": "short_answer",
                "prompt": "What problem does a serializable isolation level try to prevent?",
            },
        ],
    },
    {
        "code": "EEE-210",
        "title": "Circuit Analysis",
        "dept": "EEE",
        "teacher_key": "teacher3",
        "units": [
            {
                "title": "DC resistive circuits",
                "summary": "Ohm's law, KCL, KVL, and equivalent resistance.",
                "focus": "Students simplify networks and solve for branch currents systematically.",
            },
            {
                "title": "AC steady state",
                "summary": "Phasors, impedance, and power in sinusoidal circuits.",
                "focus": "Students convert time-domain sources to phasor form and compute real/reactive power.",
            },
            {
                "title": "Transient response",
                "summary": "RC and RL first-order circuits and time constants.",
                "focus": "Students sketch capacitor/inductor voltage curves and predict settling time.",
            },
        ],
        "exam_title": "Circuit Analysis Quiz",
        "exam_questions": [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "Kirchhoff's Current Law states that the algebraic sum of currents at a node is:",
                "options": ["Zero", "Equal to voltage", "Always positive", "Infinite"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "Write Ohm's law relating voltage, current, and resistance.",
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "In AC steady state, inductor impedance magnitude increases with:",
                "options": ["Frequency", "Capacitance only", "DC offset", "Temperature only"],
            },
            {
                "id": "q4",
                "kind": "single_choice",
                "prompt": "The time constant tau for an RC circuit equals:",
                "options": ["R * C", "R / C", "L / R", "V / I"],
            },
            {
                "id": "q5",
                "kind": "short_answer",
                "prompt": "What does power factor measure in an AC circuit?",
            },
            {
                "id": "q6",
                "kind": "single_choice",
                "prompt": "Capacitors in series combine like resistors in:",
                "options": ["Parallel", "Series", "Delta only", "Mesh"],
            },
        ],
    },
    {
        "code": "PY-101",
        "title": "Python Programming",
        "dept": "CSE",
        "teacher_key": "teacher4",
        "use_python_units": True,
        "exam_title": "Python Fundamentals Quiz",
        "exam_questions": [],
    },
    {
        "code": "CSE-401",
        "title": "Operating Systems",
        "dept": "CSE",
        "teacher_key": "teacher5",
        "units": [
            {
                "title": "Processes and threads",
                "summary": "Process state, context switching, and user/kernel threads.",
                "focus": "Students compare concurrency models and identify race conditions.",
            },
            {
                "title": "CPU scheduling",
                "summary": "FCFS, SJF, round-robin, and multilevel feedback queues.",
                "focus": "Students compute waiting/turnaround times on small examples.",
            },
            {
                "title": "Memory management",
                "summary": "Paging, segmentation, TLBs, and virtual memory.",
                "focus": "Students translate virtual addresses and explain page faults.",
            },
        ],
        "exam_title": "Operating Systems Quiz",
        "exam_questions": [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "A context switch saves and restores what?",
                "options": ["Process/thread CPU state", "Disk contents", "Network routes", "Compiler symbols"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "Define a race condition in concurrent programs.",
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "Round-robin scheduling is most fair when quanta are:",
                "options": ["Small relative to burst times", "Equal to disk latency", "Ignored", "Infinite"],
            },
            {
                "id": "q4",
                "kind": "single_choice",
                "prompt": "A page fault occurs when:",
                "options": [
                    "A referenced page is not in physical memory",
                    "CPU overheats",
                    "A thread exits",
                    "A file is deleted",
                ],
            },
            {
                "id": "q5",
                "kind": "short_answer",
                "prompt": "Why does a TLB reduce effective memory access time?",
            },
            {
                "id": "q6",
                "kind": "single_choice",
                "prompt": "Mutexes are primarily used to:",
                "options": ["Protect critical sections", "Schedule disk I/O", "Compile kernels", "Format filesystems"],
            },
        ],
    },
    {
        "code": "CSE-405",
        "title": "Computer Networks",
        "dept": "CSE",
        "teacher_key": "teacher",
        "units": [
            {
                "title": "Layered models",
                "summary": "OSI and TCP/IP responsibilities from physical to application layer.",
                "focus": "Students map protocols to layers and explain encapsulation.",
            },
            {
                "title": "IP and routing",
                "summary": "IPv4 addressing, subnets, NAT, and basic routing tables.",
                "focus": "Students calculate network/broadcast addresses and longest-prefix matches.",
            },
            {
                "title": "Transport protocols",
                "summary": "UDP vs TCP, ports, reliability, and congestion control overview.",
                "focus": "Students contrast connection setup, flow control, and loss recovery.",
            },
        ],
        "exam_title": "Computer Networks Quiz",
        "exam_questions": [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "TCP provides:",
                "options": ["Reliable byte-stream delivery", "Connectionless datagrams only", "Physical encoding", "MAC addressing"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "What is the purpose of a subnet mask?",
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "HTTP typically runs over which transport on port 80/443?",
                "options": ["TCP", "UDP", "ICMP", "ARP"],
            },
            {
                "id": "q4",
                "kind": "single_choice",
                "prompt": "DNS primarily translates:",
                "options": ["Hostnames to IP addresses", "IP to MAC only", "Files to blocks", "Voltage to current"],
            },
            {
                "id": "q5",
                "kind": "short_answer",
                "prompt": "Name one difference between UDP and TCP.",
            },
            {
                "id": "q6",
                "kind": "single_choice",
                "prompt": "A router forwards packets based on:",
                "options": ["Destination IP and routing table", "Application payload only", "HTTP cookies", "CPU serial number"],
            },
            {
                "id": "q7",
                "kind": "short_answer",
                "prompt": "What does NAT allow on a home network?",
            },
        ],
    },
    {
        "code": "CSE-410",
        "title": "Software Engineering",
        "dept": "CSE",
        "teacher_key": "teacher2",
        "units": [
            {
                "title": "Requirements engineering",
                "summary": "User stories, acceptance criteria, and traceability.",
                "focus": "Students distinguish functional vs non-functional requirements.",
            },
            {
                "title": "Design and architecture",
                "summary": "Modularity, APIs, layering, and basic UML class diagrams.",
                "focus": "Students justify coupling/cohesion trade-offs in small systems.",
            },
            {
                "title": "Testing and delivery",
                "summary": "Unit tests, CI pipelines, code review, and release hygiene.",
                "focus": "Students write testable modules and define done for features.",
            },
        ],
        "exam_title": "Software Engineering Quiz",
        "exam_questions": [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "A non-functional requirement describes:",
                "options": ["Quality attributes like performance", "A single button click", "Variable names", "Git branches"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "What should a good acceptance criterion make clear?",
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "High cohesion means a module:",
                "options": ["Does one related job well", "Depends on many unrelated modules", "Has no tests", "Uses global state"],
            },
            {
                "id": "q4",
                "kind": "single_choice",
                "prompt": "Regression tests help ensure:",
                "options": ["Old behavior still works after changes", "UI colors match brand", "Servers never restart", "Comments are removed"],
            },
            {
                "id": "q5",
                "kind": "short_answer",
                "prompt": "Why is code review useful before merging?",
            },
            {
                "id": "q6",
                "kind": "single_choice",
                "prompt": "Continuous integration mainly automates:",
                "options": ["Build and test on each change", "Salary payments", "Hardware procurement", "Exam seating"],
            },
        ],
    },
    {
        "code": "CSE-415",
        "title": "Machine Learning",
        "dept": "CSE",
        "teacher_key": "teacher3",
        "units": [
            {
                "title": "Supervised learning",
                "summary": "Regression, classification, loss functions, and train/validation splits.",
                "focus": "Students fit simple models and interpret bias-variance trade-offs.",
            },
            {
                "title": "Model evaluation",
                "summary": "Accuracy pitfalls, precision/recall, ROC, and cross-validation.",
                "focus": "Students choose metrics aligned with business costs of errors.",
            },
            {
                "title": "Feature pipelines",
                "summary": "Scaling, encoding, leakage, and reproducible preprocessing.",
                "focus": "Students build sklearn-style pipelines that survive deployment.",
            },
        ],
        "exam_title": "Machine Learning Quiz",
        "exam_questions": [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "Overfitting means the model:",
                "options": ["Memorizes training noise", "Always underfits", "Has no parameters", "Ignores labels"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "Why hold out a validation set during training?",
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "Precision measures:",
                "options": ["True positives among predicted positives", "All recall values", "Training loss only", "Feature count"],
            },
            {
                "id": "q4",
                "kind": "single_choice",
                "prompt": "Data leakage happens when:",
                "options": ["Future information enters training features", "RAM is too small", "GPU is missing", "CSV has headers"],
            },
            {
                "id": "q5",
                "kind": "short_answer",
                "prompt": "Name one reason to scale numeric features before gradient descent.",
            },
            {
                "id": "q6",
                "kind": "single_choice",
                "prompt": "Cross-validation helps estimate:",
                "options": ["Generalization performance", "Compiler speed", "Cable length", "Room capacity"],
            },
        ],
    },
    {
        "code": "CSE-420",
        "title": "Web Technologies",
        "dept": "CSE",
        "teacher_key": "teacher4",
        "units": [
            {
                "title": "HTML, CSS, and accessibility",
                "summary": "Semantic markup, responsive layout, and WCAG-oriented patterns.",
                "focus": "Students structure pages for screen readers and keyboard navigation.",
            },
            {
                "title": "JavaScript and the DOM",
                "summary": "Events, fetch, async/await, and component thinking.",
                "focus": "Students build interactive forms with validation and error states.",
            },
            {
                "title": "Backend integration",
                "summary": "REST APIs, authentication cookies, and basic security headers.",
                "focus": "Students consume JSON APIs and handle loading/error UX.",
            },
        ],
        "exam_title": "Web Technologies Quiz",
        "exam_questions": [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "Semantic HTML helps assistive tech by:",
                "options": ["Exposing meaningful structure", "Removing all CSS", "Inlining scripts", "Disabling forms"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "What does CORS control in browsers?",
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "fetch() returns a Promise that resolves to a:",
                "options": ["Response object", "DOM node", "SQL cursor", "CSS file"],
            },
            {
                "id": "q4",
                "kind": "single_choice",
                "prompt": "HttpOnly cookies help mitigate:",
                "options": ["Some XSS token theft", "All SQL injection", "Disk failure", "Packet loss"],
            },
            {
                "id": "q5",
                "kind": "short_answer",
                "prompt": "Why use alt text on informative images?",
            },
            {
                "id": "q6",
                "kind": "single_choice",
                "prompt": "A 401 HTTP status usually means:",
                "options": ["Authentication required or failed", "Server crashed", "Success", "Redirect loop"],
            },
            {
                "id": "q7",
                "kind": "short_answer",
                "prompt": "Name one benefit of responsive CSS layouts.",
            },
        ],
    },
    {
        "code": "CSE-425",
        "title": "Discrete Mathematics",
        "dept": "CSE",
        "teacher_key": "teacher5",
        "units": [
            {
                "title": "Logic and proofs",
                "summary": "Propositions, predicates, and direct/contradiction proofs.",
                "focus": "Students write short proofs about integers and sets.",
            },
            {
                "title": "Sets, relations, and functions",
                "summary": "Cardinality, equivalence, partial orders, and bijections.",
                "focus": "Students classify relations and compose functions correctly.",
            },
            {
                "title": "Combinatorics",
                "summary": "Counting rules, permutations, combinations, and pigeonhole principle.",
                "focus": "Students solve arrangement problems without overcounting.",
            },
        ],
        "exam_title": "Discrete Mathematics Quiz",
        "exam_questions": [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "A statement and its contrapositive are:",
                "options": ["Logically equivalent", "Always false", "Unrelated", "Only true for sets"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "State the pigeonhole principle informally.",
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "The number of 3-permutations from 5 distinct items is:",
                "options": ["60", "10", "15", "125"],
            },
            {
                "id": "q4",
                "kind": "single_choice",
                "prompt": "A relation that is reflexive, symmetric, and transitive is an:",
                "options": ["Equivalence relation", "Strict order only", "Function always", "Empty set"],
            },
            {
                "id": "q5",
                "kind": "short_answer",
                "prompt": "What makes a function bijective?",
            },
            {
                "id": "q6",
                "kind": "single_choice",
                "prompt": "De Morgan's law states NOT(A AND B) equals:",
                "options": ["(NOT A) OR (NOT B)", "A OR B", "NOT A AND B", "A XOR B"],
            },
        ],
    },
]

MVP_STUDENT_NAMES = [
    "Samir",
    "Nadia",
    "Kabir",
    "Meera",
    "Rafi",
    "Ayesha",
    "Sadia",
    "Hasan",
    "Mitu",
    "Robin",
    "Nusrat",
    "Fahim",
]
