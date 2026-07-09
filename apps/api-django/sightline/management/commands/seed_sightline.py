from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from sightline.course_rag import index_course
from sightline.models import (
    AcademicRecordImport,
    AlertEvent,
    AssessmentRecord,
    AttendanceRecord,
    Camera,
    ClassSchedule,
    Course,
    CourseEnrollment,
    CourseMaterial,
    CourseUnit,
    Department,
    EvidenceAsset,
    ExamSchedule,
    ExamSession,
    FacultyProfile,
    Hall,
    NotificationEvent,
    OperationalHealth,
    ReminderRule,
    ReviewerAction,
    Seat,
    Semester,
    StudentProfile,
    UserProfile,
)
from sightline.services import calculate_risk_run, generate_due_notifications


PYTHON_COURSE_CODE = "PY-101"
PYTHON_COURSE_TITLE = "Python"
PYTHON_COURSE_DOC_URI = "docs/course-materials/python-course-demo.md"
PYTHON_QUIZ_TITLE = "Python Unit Quiz Bank"
PYTHON_QUIZ_INSTRUCTIONS = "Five questions are provided for each Python unit in this local demo quiz bank."

PYTHON_UNITS = [
    {
        "title": "Getting Started with Python",
        "summary": "Install Python, run scripts, use the REPL, and read simple traceback messages.",
        "focus": "Students practice terminal commands, editor setup, print output, comments, and script execution.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "Which command runs a Python file named app.py from a terminal?",
                "options": ["python app.py", "python install app.py", "pip app.py", "run python app.py"],
                "answer": "python app.py",
            },
            {
                "kind": "single_choice",
                "prompt": "What is the interactive Python prompt mainly used for?",
                "options": ["Trying code quickly", "Installing packages", "Compressing files", "Designing web pages"],
                "answer": "Trying code quickly",
            },
            {
                "kind": "short_answer",
                "prompt": "Why should beginners read the last line of a traceback first?",
                "answer": "It usually names the exception type and the clearest error message.",
            },
            {
                "kind": "single_choice",
                "prompt": "Which character starts a single-line comment in Python?",
                "options": ["#", "//", "<!--", "--"],
                "answer": "#",
            },
            {
                "kind": "short_answer",
                "prompt": "What is one difference between running a script and using the REPL?",
                "answer": "A script runs saved code as a program, while the REPL evaluates one entered expression or statement at a time.",
            },
        ],
    },
    {
        "title": "Variables and Data Types",
        "summary": "Use names, numbers, strings, booleans, None, and type conversion in small programs.",
        "focus": "Students connect variable assignment to object references and choose appropriate built-in types.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "What does the assignment statement score = 10 do?",
                "options": [
                    "Binds the name score to the integer 10",
                    "Creates a permanent constant",
                    "Prints 10",
                    "Deletes score",
                ],
                "answer": "Binds the name score to the integer 10",
            },
            {
                "kind": "single_choice",
                "prompt": "Which value represents the absence of a useful result?",
                "options": ["None", "False", "0", "empty"],
                "answer": "None",
            },
            {
                "kind": "short_answer",
                "prompt": "Why can input() return a string even when the user types digits?",
                "answer": "User input is text, so code must convert it with int(), float(), or another parser when numeric behavior is needed.",
            },
            {
                "kind": "single_choice",
                "prompt": "Which expression creates an f-string?",
                "options": ["f\"Hello {name}\"", "\"Hello\" + name", "format name", "$\"Hello {name}\""],
                "answer": "f\"Hello {name}\"",
            },
            {
                "kind": "short_answer",
                "prompt": "Name two numeric types commonly used in beginner Python programs.",
                "answer": "int and float.",
            },
        ],
    },
    {
        "title": "Control Flow",
        "summary": "Choose paths with if statements and repeat work with for and while loops.",
        "focus": "Students use boolean expressions, indentation, ranges, break, and continue to control execution.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "What does indentation define in Python control flow?",
                "options": ["The block of code controlled by a statement", "The file name", "The package version", "The memory size"],
                "answer": "The block of code controlled by a statement",
            },
            {
                "kind": "single_choice",
                "prompt": "Which loop is usually best when iterating over every item in a list?",
                "options": ["for", "while", "switch", "repeat"],
                "answer": "for",
            },
            {
                "kind": "short_answer",
                "prompt": "When is a while loop a natural choice?",
                "answer": "When repetition should continue until a condition changes rather than for a known collection of items.",
            },
            {
                "kind": "single_choice",
                "prompt": "What does break do inside a loop?",
                "options": ["Exits the nearest loop", "Skips one iteration", "Restarts the script", "Creates a function"],
                "answer": "Exits the nearest loop",
            },
            {
                "kind": "short_answer",
                "prompt": "What should an if condition evaluate to?",
                "answer": "A truthy or falsy value that Python can use as a boolean decision.",
            },
        ],
    },
    {
        "title": "Functions and Scope",
        "summary": "Package reusable behavior with parameters, return values, docstrings, and local scope.",
        "focus": "Students decompose scripts into small functions that are easy to call, test, and read.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "Which keyword defines a function?",
                "options": ["def", "func", "lambda", "method"],
                "answer": "def",
            },
            {
                "kind": "single_choice",
                "prompt": "What does return do?",
                "options": ["Sends a value back to the caller", "Prints a value automatically", "Creates a loop", "Imports a module"],
                "answer": "Sends a value back to the caller",
            },
            {
                "kind": "short_answer",
                "prompt": "Why should a function usually do one clear job?",
                "answer": "It becomes easier to read, reuse, test, and change without affecting unrelated behavior.",
            },
            {
                "kind": "single_choice",
                "prompt": "Where is a local variable created inside a function normally available?",
                "options": ["Inside that function call", "Every module", "Only in the terminal", "All future programs"],
                "answer": "Inside that function call",
            },
            {
                "kind": "short_answer",
                "prompt": "What should a short docstring explain?",
                "answer": "What the function does, important arguments, and the returned result when that is not obvious.",
            },
        ],
    },
    {
        "title": "Data Structures",
        "summary": "Model collections with lists, tuples, dictionaries, sets, and comprehensions.",
        "focus": "Students select containers by access pattern, mutability, uniqueness, and key-based lookup needs.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "Which data structure stores key-value pairs?",
                "options": ["dict", "list", "tuple", "set"],
                "answer": "dict",
            },
            {
                "kind": "single_choice",
                "prompt": "Which collection automatically keeps unique items?",
                "options": ["set", "list", "tuple", "str"],
                "answer": "set",
            },
            {
                "kind": "short_answer",
                "prompt": "What does a list comprehension help you do?",
                "answer": "Build a new list from an iterable using a compact expression and optional filter.",
            },
            {
                "kind": "single_choice",
                "prompt": "Which collection is immutable once created?",
                "options": ["tuple", "list", "dict", "set"],
                "answer": "tuple",
            },
            {
                "kind": "short_answer",
                "prompt": "Why is a dictionary useful for counting items?",
                "answer": "Each item can be a key and its count can be updated as the value.",
            },
        ],
    },
    {
        "title": "Files and Exceptions",
        "summary": "Read and write files, handle expected failures, and work with text and JSON data.",
        "focus": "Students use with open(...), understand file modes, catch specific exceptions, and keep error messages helpful.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "Why is with open(...) recommended for files?",
                "options": [
                    "It closes the file automatically",
                    "It makes every file read-only",
                    "It converts files to JSON",
                    "It skips all exceptions",
                ],
                "answer": "It closes the file automatically",
            },
            {
                "kind": "single_choice",
                "prompt": "Which mode opens a text file for writing and replaces existing content?",
                "options": ["w", "r", "a", "x+"],
                "answer": "w",
            },
            {
                "kind": "short_answer",
                "prompt": "Why should exception handlers catch specific exception types?",
                "answer": "Specific handlers avoid hiding unrelated bugs and make recovery logic clearer.",
            },
            {
                "kind": "single_choice",
                "prompt": "Which standard module is commonly used to parse JSON text?",
                "options": ["json", "csv", "pathlib", "math"],
                "answer": "json",
            },
            {
                "kind": "short_answer",
                "prompt": "What is one useful thing to include in an error message for a file operation?",
                "answer": "The file path or operation being attempted so the user can fix the problem.",
            },
        ],
    },
    {
        "title": "Object-Oriented Programming",
        "summary": "Create classes, initialize objects, use methods, and compare inheritance with composition.",
        "focus": "Students model state and behavior together while keeping classes small and purposeful.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "Which method initializes a new object?",
                "options": ["__init__", "__main__", "__call__", "__start__"],
                "answer": "__init__",
            },
            {
                "kind": "single_choice",
                "prompt": "What does self usually refer to in an instance method?",
                "options": ["The current object", "The current file", "The parent package", "The Python interpreter"],
                "answer": "The current object",
            },
            {
                "kind": "short_answer",
                "prompt": "When is a class a better fit than a plain dictionary?",
                "answer": "When data and related behavior should travel together behind clear methods.",
            },
            {
                "kind": "single_choice",
                "prompt": "What does inheritance let a subclass do?",
                "options": ["Reuse and specialize behavior from a base class", "Install packages", "Read files faster", "Create comments"],
                "answer": "Reuse and specialize behavior from a base class",
            },
            {
                "kind": "short_answer",
                "prompt": "Why can composition be simpler than deep inheritance?",
                "answer": "Objects can be built from smaller collaborators without coupling everything to a large class hierarchy.",
            },
        ],
    },
    {
        "title": "Modules, Packages, and Environments",
        "summary": "Organize code across files, import modules, install packages, and isolate dependencies.",
        "focus": "Students create reusable modules, understand virtual environments, and record dependencies for teammates.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "Which statement imports the math module?",
                "options": ["import math", "use math", "include math", "package math"],
                "answer": "import math",
            },
            {
                "kind": "single_choice",
                "prompt": "What is a virtual environment used for?",
                "options": [
                    "Isolating project dependencies",
                    "Encrypting source code",
                    "Making code run without Python",
                    "Replacing version control",
                ],
                "answer": "Isolating project dependencies",
            },
            {
                "kind": "short_answer",
                "prompt": "Why should projects record package dependencies?",
                "answer": "Other developers and deployment systems can recreate the same environment reliably.",
            },
            {
                "kind": "single_choice",
                "prompt": "What is pip commonly used for?",
                "options": ["Installing Python packages", "Formatting hard drives", "Creating CSS", "Running SQL joins"],
                "answer": "Installing Python packages",
            },
            {
                "kind": "short_answer",
                "prompt": "What is the purpose of the if __name__ == \"__main__\" guard?",
                "answer": "It runs script-only code when the file is executed directly, not when it is imported.",
            },
        ],
    },
    {
        "title": "Testing and Debugging",
        "summary": "Write repeatable tests, inspect failures, debug with prints or breakpoints, and cover edge cases.",
        "focus": "Students turn examples into tests and use failures as concrete feedback.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "What does an assertion check in a test?",
                "options": ["That an expected condition is true", "That a package is installed", "That a file is encrypted", "That comments exist"],
                "answer": "That an expected condition is true",
            },
            {
                "kind": "single_choice",
                "prompt": "What is an edge case?",
                "options": [
                    "An unusual but important input or boundary condition",
                    "A comment at the end of a file",
                    "A package installer",
                    "A type of loop that never ends",
                ],
                "answer": "An unusual but important input or boundary condition",
            },
            {
                "kind": "short_answer",
                "prompt": "Why should a failing test be small and focused?",
                "answer": "It points to the behavior that broke and makes the fix easier to verify.",
            },
            {
                "kind": "single_choice",
                "prompt": "Which tool can pause Python execution for interactive inspection?",
                "options": ["pdb", "json", "venv", "pip"],
                "answer": "pdb",
            },
            {
                "kind": "short_answer",
                "prompt": "What should you inspect in a traceback besides the final error line?",
                "answer": "The call stack and file line numbers that show how execution reached the failure.",
            },
        ],
    },
    {
        "title": "Working with APIs and Automation",
        "summary": "Call HTTP APIs, parse JSON responses, use environment variables, and automate repeated tasks.",
        "focus": "Students build small scripts that fetch data, validate responses, and handle operational errors.",
        "quiz": [
            {
                "kind": "single_choice",
                "prompt": "What does an HTTP status code in the 200 range usually mean?",
                "options": ["The request succeeded", "The server is missing", "Authentication failed", "The request was redirected forever"],
                "answer": "The request succeeded",
            },
            {
                "kind": "single_choice",
                "prompt": "Why are environment variables useful for API keys?",
                "options": [
                    "They keep secrets out of source code",
                    "They make strings immutable",
                    "They remove the need for tests",
                    "They compress JSON",
                ],
                "answer": "They keep secrets out of source code",
            },
            {
                "kind": "short_answer",
                "prompt": "What should a script do when an API request fails?",
                "answer": "Check the status or exception, report a useful message, and avoid treating missing data as valid.",
            },
            {
                "kind": "single_choice",
                "prompt": "Which data format do web APIs commonly return for Python scripts to parse?",
                "options": ["JSON", "PNG", "MP3", "EXE"],
                "answer": "JSON",
            },
            {
                "kind": "short_answer",
                "prompt": "Name one task a Python automation script can handle.",
                "answer": "Examples include renaming files, downloading reports, checking API data, sending reminders, or cleaning CSV rows.",
            },
        ],
    },
]


def _python_course_doc_text():
    doc_path = Path(settings.BASE_DIR).parent.parent / PYTHON_COURSE_DOC_URI
    try:
        return doc_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return (
            "# Python Course Demo\n\n"
            "This seeded local course contains 10 Python units and five practice quiz questions per unit."
        )


def _python_unit_material_text(order, unit):
    lines = [
        f"Unit {order}: {unit['title']}",
        f"Summary: {unit['summary']}",
        f"Study focus: {unit['focus']}",
        "",
        "Practice quiz with answers:",
    ]
    for index, question in enumerate(unit["quiz"], start=1):
        lines.append(f"{index}. {question['prompt']}")
        if question.get("options"):
            lines.append("   Options: " + "; ".join(question["options"]))
        lines.append(f"   Answer: {question['answer']}")
    return "\n".join(lines)


def _python_exam_questions():
    questions = []
    for unit_index, unit in enumerate(PYTHON_UNITS, start=1):
        for question_index, question in enumerate(unit["quiz"], start=1):
            payload = {
                "id": f"u{unit_index:02d}-q{question_index}",
                "unit": unit_index,
                "kind": question["kind"],
                "prompt": f"Unit {unit_index} ({unit['title']}): {question['prompt']}",
            }
            if question.get("options"):
                payload["options"] = question["options"]
            questions.append(payload)
    return questions


def _seed_python_course_materials(course):
    CourseMaterial.objects.update_or_create(
        course=course,
        unit=None,
        title="Python course guide",
        defaults={
            "uploaded_by": course.teacher,
            "kind": CourseMaterial.KIND_DOC,
            "description": "Markdown guide for the seeded Python course, units, and practice quizzes.",
            "content_text": _python_course_doc_text(),
            "uri": PYTHON_COURSE_DOC_URI,
            "original_filename": Path(PYTHON_COURSE_DOC_URI).name,
            "order": 0,
        },
    )
    for order, unit_data in enumerate(PYTHON_UNITS, start=1):
        unit, _ = CourseUnit.objects.update_or_create(
            course=course,
            order=order,
            defaults={"title": unit_data["title"], "summary": unit_data["summary"]},
        )
        CourseMaterial.objects.update_or_create(
            course=course,
            unit=unit,
            title=f"Unit {order}: {unit_data['title']} notes and quiz",
            defaults={
                "uploaded_by": course.teacher,
                "kind": CourseMaterial.KIND_TEXT,
                "description": "Seeded Python unit notes with five practice quiz questions and answers.",
                "content_text": _python_unit_material_text(order, unit_data),
                "uri": "",
                "order": order,
            },
        )


class Command(BaseCommand):
    help = "Seed Sightline with phase-1 demo data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-vector-index",
            action="store_true",
            help="Create demo course records without indexing seeded Python content into Qdrant.",
        )

    def handle(self, *args, **options):
        now = timezone.now()

        cse, _ = Department.objects.get_or_create(code="CSE", defaults={"name": "Computer Science and Engineering"})
        eee, _ = Department.objects.get_or_create(code="EEE", defaults={"name": "Electrical and Electronic Engineering"})
        semester, _ = Semester.objects.get_or_create(
            name="Spring 2026",
            defaults={"starts_on": now.date().replace(month=1, day=15), "ends_on": now.date().replace(month=5, day=30)},
        )
        algorithms, _ = Course.objects.get_or_create(
            semester=semester,
            code="CSE-321",
            defaults={"department": cse, "title": "Algorithms"},
        )
        databases, _ = Course.objects.get_or_create(
            semester=semester,
            code="CSE-335",
            defaults={"department": cse, "title": "Database Systems"},
        )
        circuits, _ = Course.objects.get_or_create(
            semester=semester,
            code="EEE-210",
            defaults={"department": eee, "title": "Circuit Analysis"},
        )
        python_course, _ = Course.objects.update_or_create(
            semester=semester,
            code=PYTHON_COURSE_CODE,
            defaults={"department": cse, "title": PYTHON_COURSE_TITLE},
        )

        user_specs = [
            ("admin", "Asha", "Admin", UserProfile.ROLE_ADMIN),
            ("invigilator", "Ira", "Invigilator", UserProfile.ROLE_INVIGILATOR),
            ("invigilator2", "Imran", "Invigilator", UserProfile.ROLE_INVIGILATOR),
            ("invigilator3", "Iffat", "Invigilator", UserProfile.ROLE_INVIGILATOR),
            ("teacher", "Tania", "Teacher", UserProfile.ROLE_TEACHER),
            ("teacher2", "Tanvir", "Teacher", UserProfile.ROLE_TEACHER),
            ("teacher3", "Tahmina", "Teacher", UserProfile.ROLE_TEACHER),
            ("teacher4", "Tareq", "Teacher", UserProfile.ROLE_TEACHER),
            ("teacher5", "Tasnim", "Teacher", UserProfile.ROLE_TEACHER),
        ]
        user_specs.extend(
            [
                (
                    "student" if index == 1 else f"student{index:02d}",
                    first_name,
                    "Student",
                    UserProfile.ROLE_STUDENT,
                )
                for index, first_name in enumerate(
                    [
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
                        "Joya",
                        "Arif",
                        "Maliha",
                        "Rupa",
                        "Sakib",
                        "Farhan",
                        "Lamia",
                        "Sohan",
                    ],
                    start=1,
                )
            ]
        )
        desired_usernames = {username for username, *_ in user_specs}
        User.objects.filter(email__endswith="@sightline.local").exclude(username__in=desired_usernames).delete()

        users = {
            username: self.user(username, first_name, last_name, role, cse)
            for username, first_name, last_name, role in user_specs
        }
        for username in ["teacher", "teacher2", "teacher3", "teacher4", "teacher5"]:
            user = users[username]
            FacultyProfile.objects.update_or_create(
                user=user,
                defaults={"department": cse, "full_name": user.get_full_name() or user.username},
            )

        course_teacher_pairs = [
            (algorithms, users["teacher"]),
            (databases, users["teacher2"]),
            (circuits, users["teacher3"]),
            (python_course, users["teacher4"]),
        ]
        for course, teacher in course_teacher_pairs:
            course.teacher = teacher
            course.save(update_fields=["teacher", "updated_at"])

        for course, unit_rows in {
            algorithms: [
                ("Algorithm foundations", "Growth rates, correctness, and the shape of efficient problem solving."),
                ("Graph traversal", "Breadth-first and depth-first search with practical traversal examples."),
                ("Dynamic programming", "Breaking overlapping subproblems into reusable state transitions."),
            ],
            databases: [
                ("Relational model", "Tables, keys, relationships, and normalization basics."),
                ("SQL querying", "Filtering, grouping, joining, and query performance."),
            ],
        }.items():
            for order, (title, summary) in enumerate(unit_rows, start=1):
                unit, _ = CourseUnit.objects.update_or_create(
                    course=course,
                    order=order,
                    defaults={"title": title, "summary": summary},
                )
                CourseMaterial.objects.update_or_create(
                    course=course,
                    unit=unit,
                    title=f"{title} notes",
                    defaults={
                        "uploaded_by": course.teacher,
                        "kind": CourseMaterial.KIND_TEXT,
                        "description": "Seeded unit notes for course chat and student review.",
                        "content_text": summary
                        + " Students should connect definitions to examples and be ready to explain the main idea in short answers.",
                        "uri": "",
                        "order": 1,
                    },
                )

        _seed_python_course_materials(python_course)

        hall_a, _ = Hall.objects.get_or_create(name="Hall A", defaults={"building": "Academic Block", "capacity": 96})
        hall_b, _ = Hall.objects.get_or_create(name="Hall B", defaults={"building": "Engineering Annex", "capacity": 64})
        for label in ["A1", "A2", "A3", "B1", "B2", "B3"]:
            Seat.objects.get_or_create(hall=hall_a, label=label, defaults={"region": f"Desk cluster {label[0]}"})
        for label in ["C1", "C2", "C3"]:
            Seat.objects.get_or_create(hall=hall_b, label=label, defaults={"region": "North row"})

        cam_a1, _ = Camera.objects.get_or_create(
            hall=hall_a,
            name="Uploaded Exam Video",
            defaults={
                "stream_url": "file://demo/hall-a-upload.mp4",
                "status": Camera.STATUS_ACTIVE,
                "last_health_message": "Demo video ready",
                "last_seen_at": now,
            },
        )
        Camera.objects.get_or_create(
            hall=hall_a,
            name="Backup Demo Video",
            defaults={
                "stream_url": "file://demo/hall-a-backup.mp4",
                "status": Camera.STATUS_DEGRADED,
                "last_health_message": "Demo analysis intentionally marked degraded",
                "last_seen_at": now - timezone.timedelta(minutes=6),
            },
        )
        Camera.objects.get_or_create(
            hall=hall_b,
            name="Uploaded Exam Video B",
            defaults={
                "stream_url": "file://demo/hall-b-upload.mp4",
                "status": Camera.STATUS_ACTIVE,
                "last_health_message": "Demo video ready",
                "last_seen_at": now,
            },
        )

        live_exam, _ = ExamSession.objects.get_or_create(
            course=algorithms,
            hall=hall_a,
            starts_at=now - timezone.timedelta(minutes=20),
            defaults={"ends_at": now + timezone.timedelta(minutes=100), "status": ExamSession.STATUS_LIVE},
        )
        live_exam.quiz_title = "Secure Browser Demo Quiz"
        live_exam.quiz_instructions = "Answer each question and submit the monitored attempt."
        live_exam.quiz_questions = [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "Which browser API can detect whether the quiz tab is no longer visible?",
                "options": ["Clipboard API", "Tab Visibility API", "Notification API", "Web Speech API"],
            },
            {
                "id": "q2",
                "kind": "single_choice",
                "prompt": "Which monitoring cadence does this ProcBot demo use?",
                "options": [
                    "Tab switch realtime, face every 1 second, phone every 1 second",
                    "Everything runs every 1 second",
                    "Face and phone detection run only on submit",
                    "Manual instructor review only",
                ],
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "A webcam sample reports zero faces for several checks. Which anomaly should be classified?",
                "options": ["TabSwitch", "MultiPerson", "FaceGone", "NetworkIdle"],
            },
            {
                "id": "q4",
                "kind": "short_answer",
                "prompt": "Describe why evidence screenshots help an instructor review alerts.",
            },
        ]
        live_exam.save(update_fields=["quiz_title", "quiz_instructions", "quiz_questions", "updated_at"])
        database_exam, _ = ExamSession.objects.get_or_create(
            course=databases,
            hall=hall_b,
            starts_at=now + timezone.timedelta(days=2),
            defaults={"ends_at": now + timezone.timedelta(days=2, hours=2), "status": ExamSession.STATUS_PREPARED},
        )
        database_exam.quiz_title = "Database Systems Quiz"
        database_exam.quiz_instructions = "Teacher-created sample quiz for enrolled students."
        database_exam.quiz_questions = [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "Which SQL clause filters grouped rows after aggregation?",
                "options": ["WHERE", "HAVING", "ORDER BY", "JOIN"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "Explain one reason database indexes can improve query performance.",
            },
        ]
        database_exam.save(update_fields=["quiz_title", "quiz_instructions", "quiz_questions", "updated_at"])

        python_exam = ExamSession.objects.filter(course=python_course, quiz_title=PYTHON_QUIZ_TITLE).order_by("id").first()
        if python_exam is None:
            python_exam = ExamSession.objects.create(
                course=python_course,
                hall=hall_a,
                starts_at=now + timezone.timedelta(days=4),
                ends_at=now + timezone.timedelta(days=4, hours=2),
                status=ExamSession.STATUS_PREPARED,
                quiz_title=PYTHON_QUIZ_TITLE,
            )
        python_exam.hall = hall_a
        python_exam.starts_at = now + timezone.timedelta(days=4)
        python_exam.ends_at = now + timezone.timedelta(days=4, hours=2)
        python_exam.status = ExamSession.STATUS_PREPARED
        python_exam.quiz_title = PYTHON_QUIZ_TITLE
        python_exam.quiz_instructions = PYTHON_QUIZ_INSTRUCTIONS
        python_exam.quiz_questions = _python_exam_questions()
        python_exam.save(
            update_fields=[
                "hall",
                "starts_at",
                "ends_at",
                "status",
                "quiz_title",
                "quiz_instructions",
                "quiz_questions",
                "updated_at",
            ]
        )

        student_rows = []
        for index in range(1, 21):
            username = "student" if index == 1 else f"student{index:02d}"
            first_name = users[username].first_name
            student_rows.append(
                (
                    f"S-{1000 + index}",
                    f"{first_name} Student",
                    "2023-CSE-A" if index <= 10 else "2023-CSE-B",
                    users[username],
                    12 + (index * 3) % 13,
                    24,
                    Decimal(str(35 + (index * 7) % 55)),
                    Decimal("100"),
                )
            )
        students = []
        for number, name, cohort, user, *_ in student_rows:
            student, _ = StudentProfile.objects.update_or_create(
                student_number=number,
                defaults={"user": user, "department": cse, "full_name": name, "cohort": cohort},
            )
            students.append(student)
            CourseEnrollment.objects.update_or_create(
                course=algorithms,
                student=student,
                defaults={"status": CourseEnrollment.STATUS_ACTIVE},
            )
            CourseEnrollment.objects.update_or_create(
                course=python_course,
                student=student,
                defaults={"status": CourseEnrollment.STATUS_ACTIVE},
            )

        source_import, _ = AcademicRecordImport.objects.get_or_create(
            semester=semester,
            source_name="spring-2026-week-8-sample.csv",
            defaults={"uploaded_by": users["teacher"], "status": AcademicRecordImport.STATUS_VALIDATED, "imported_rows": 4},
        )
        if not AttendanceRecord.objects.filter(source_import=source_import).exists():
            for number, _name, _cohort, _user, attended, total, score, max_score in student_rows:
                student = StudentProfile.objects.get(student_number=number)
                AttendanceRecord.objects.create(
                    source_import=source_import,
                    student=student,
                    course=algorithms,
                    attended=attended,
                    total=total,
                )
                AssessmentRecord.objects.create(
                    source_import=source_import,
                    student=student,
                    course=algorithms,
                    label="Midterm",
                    score=score,
                    max_score=max_score,
                )
            calculate_risk_run(source_import, algorithms)

        if not AlertEvent.objects.exists():
            alert = AlertEvent.objects.create(
                exam_session=live_exam,
                camera=cam_a1,
                seat=Seat.objects.get(hall=hall_a, label="A2"),
                alert_type=AlertEvent.TYPE_LOOK_AWAY,
                occurred_at=now - timezone.timedelta(minutes=3),
                window_started_at=now - timezone.timedelta(minutes=4),
                window_ended_at=now - timezone.timedelta(minutes=3),
                confidence_score=Decimal("0.81"),
                visibility_quality="clear",
                status=AlertEvent.STATUS_VISIBLE,
                summary="Repeated look-away pattern over a sustained interval.",
            )
            EvidenceAsset.objects.create(
                alert=alert,
                kind=EvidenceAsset.KIND_SNAPSHOT,
                uri="evidence://demo/look-away-snapshot",
                captured_at=alert.occurred_at,
                quality_note="Seat and head pose are visible",
            )
            dismissed = AlertEvent.objects.create(
                exam_session=live_exam,
                camera=cam_a1,
                seat=Seat.objects.get(hall=hall_a, label="A3"),
                alert_type=AlertEvent.TYPE_NEIGHBORING_DESK,
                occurred_at=now - timezone.timedelta(minutes=16),
                window_started_at=now - timezone.timedelta(minutes=17),
                window_ended_at=now - timezone.timedelta(minutes=16),
                confidence_score=Decimal("0.74"),
                visibility_quality="partially occluded",
                status=AlertEvent.STATUS_DISMISSED,
                summary="Side glance toward neighboring desk; reviewer found it transient.",
            )
            EvidenceAsset.objects.create(
                alert=dismissed,
                kind=EvidenceAsset.KIND_CLIP,
                uri="evidence://demo/neighboring-desk-clip",
                captured_at=dismissed.occurred_at,
                quality_note="Short clip retained for audit",
            )
            ReviewerAction.objects.create(
                alert=dismissed,
                reviewer=users["invigilator"],
                decision=ReviewerAction.DECISION_DISMISSED,
                note="Likely responding to dropped pencil; no further action.",
            )

        if not ClassSchedule.objects.exists():
            for offset, course in [(1, algorithms), (2, databases), (3, circuits)]:
                for student in students[:3]:
                    ClassSchedule.objects.create(
                        course=course,
                        student=student,
                        hall=hall_a if course != circuits else hall_b,
                        starts_at=now + timezone.timedelta(hours=offset * 4),
                        ends_at=now + timezone.timedelta(hours=offset * 4 + 1, minutes=20),
                    )
            for student in students[:3]:
                ExamSchedule.objects.create(
                    course=algorithms,
                    student=student,
                    hall=hall_a,
                    starts_at=now + timezone.timedelta(days=1, hours=2),
                    ends_at=now + timezone.timedelta(days=1, hours=4),
                )

        ReminderRule.objects.get_or_create(event_type=ReminderRule.EVENT_CLASS, channel=ReminderRule.CHANNEL_IN_APP, minutes_before=240)
        ReminderRule.objects.get_or_create(event_type=ReminderRule.EVENT_EXAM, channel=ReminderRule.CHANNEL_EMAIL, minutes_before=1440)
        generate_due_notifications(now + timezone.timedelta(days=2))

        OperationalHealth.objects.update_or_create(
            kind=OperationalHealth.KIND_INFERENCE,
            component="inference-worker-demo",
            defaults={"state": OperationalHealth.STATE_HEALTHY, "message": "Worker heartbeat received", "last_checked_at": now},
        )
        OperationalHealth.objects.update_or_create(
            kind=OperationalHealth.KIND_IMPORT,
            component="academic-imports",
            defaults={"state": OperationalHealth.STATE_HEALTHY, "message": "Latest import validated", "last_checked_at": now},
        )
        OperationalHealth.objects.update_or_create(
            kind=OperationalHealth.KIND_REMINDER,
            component="reminder-generation",
            defaults={"state": OperationalHealth.STATE_HEALTHY, "message": "Idempotent reminders generated", "last_checked_at": now},
        )
        for camera in Camera.objects.select_related("hall"):
            OperationalHealth.objects.update_or_create(
                kind=OperationalHealth.KIND_CAMERA,
                component=f"{camera.hall.name} / {camera.name}",
                defaults={
                    "state": OperationalHealth.STATE_DEGRADED
                    if camera.status == Camera.STATUS_DEGRADED
                    else OperationalHealth.STATE_HEALTHY,
                    "message": camera.last_health_message,
                    "last_checked_at": camera.last_seen_at or now,
                },
            )

        python_indexed_chunks = None
        if not options.get("skip_vector_index"):
            try:
                python_indexed_chunks = index_course(python_course)
            except Exception as exc:
                self.stderr.write(
                    self.style.WARNING(
                        f"Python course data was created, but vector indexing failed: {exc}"
                    )
                )

        role_counts = {
            role: UserProfile.objects.filter(role=role).count()
            for role in [
                UserProfile.ROLE_ADMIN,
                UserProfile.ROLE_INVIGILATOR,
                UserProfile.ROLE_TEACHER,
                UserProfile.ROLE_STUDENT,
            ]
        }
        self.stdout.write(
            self.style.SUCCESS(
                "Sightline demo data is ready: "
                f"{role_counts[UserProfile.ROLE_ADMIN]} admin, "
                f"{role_counts[UserProfile.ROLE_INVIGILATOR]} invigilators, "
                f"{role_counts[UserProfile.ROLE_TEACHER]} teachers, "
                f"{role_counts[UserProfile.ROLE_STUDENT]} students. "
                f"Python course: {len(PYTHON_UNITS)} units, {len(_python_exam_questions())} quiz questions"
                + (
                    f", {python_indexed_chunks} indexed chunks."
                    if python_indexed_chunks is not None
                    else "."
                )
            )
        )

    def user(self, username, first_name, last_name, role, department):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "email": f"{username}@sightline.local",
            },
        )
        if created:
            user.set_password("sightline")
        user.first_name = first_name
        user.last_name = last_name
        user.email = f"{username}@sightline.local"
        user.is_staff = role == UserProfile.ROLE_ADMIN
        user.is_superuser = role == UserProfile.ROLE_ADMIN
        user.save()
        UserProfile.objects.update_or_create(user=user, defaults={"role": role, "department": department})
        return user
