# Python Course Demo

This guide is the source document for the seeded `PY-101 Python` local demo course. Running `pnpm run api:seed` creates the course, 10 units, five practice quiz questions per unit, a Python quiz bank exam, and course materials that are indexed into the `sightline_course_content` Qdrant collection.

For a quick local bot test:

1. Run `pnpm run api:migrate`.
2. Run `pnpm run api:seed`.
3. Run `pnpm run dev`.
4. Log in as `student` with password `sightline`.
5. Open the Python course chat and ask: `What does a list comprehension do?`

The seeded teacher for this course is `teacher4`, and all demo students are enrolled so the student dashboard can open the course.

## Unit 1: Getting Started with Python

Students install Python, confirm the interpreter is available, run saved scripts, and try short expressions in the interactive REPL. A saved script is best when work should be repeated or shared. The REPL is best when a student wants quick feedback on one expression or a small statement. Beginners should learn to read traceback messages from the bottom upward because the last line usually names the exception and gives the most direct clue.

Practice quiz:

1. Which command runs a Python file named `app.py` from a terminal?
   Answer: `python app.py`.
2. What is the interactive Python prompt mainly used for?
   Answer: Trying code quickly.
3. Why should beginners read the last line of a traceback first?
   Answer: It usually names the exception type and the clearest error message.
4. Which character starts a single-line comment in Python?
   Answer: `#`.
5. What is one difference between running a script and using the REPL?
   Answer: A script runs saved code as a program, while the REPL evaluates one entered expression or statement at a time.

## Unit 2: Variables and Data Types

Python variables are names bound to objects. Common beginner types include `int`, `float`, `str`, `bool`, and `None`. User input arrives as text, so a program must convert it before numeric operations. F-strings are a readable way to format values into output. Students should choose names that describe the meaning of a value, not only its type.

Practice quiz:

1. What does the assignment statement `score = 10` do?
   Answer: It binds the name `score` to the integer `10`.
2. Which value represents the absence of a useful result?
   Answer: `None`.
3. Why can `input()` return a string even when the user types digits?
   Answer: User input is text, so code must convert it with `int()`, `float()`, or another parser when numeric behavior is needed.
4. Which expression creates an f-string?
   Answer: `f"Hello {name}"`.
5. Name two numeric types commonly used in beginner Python programs.
   Answer: `int` and `float`.

## Unit 3: Control Flow

Control flow lets a program make decisions and repeat work. `if`, `elif`, and `else` choose between paths. `for` loops are natural for collections and ranges. `while` loops are natural when repetition depends on a condition that changes over time. Indentation defines the block controlled by a statement, so formatting is part of program meaning in Python.

Practice quiz:

1. What does indentation define in Python control flow?
   Answer: The block of code controlled by a statement.
2. Which loop is usually best when iterating over every item in a list?
   Answer: `for`.
3. When is a `while` loop a natural choice?
   Answer: When repetition should continue until a condition changes rather than for a known collection of items.
4. What does `break` do inside a loop?
   Answer: It exits the nearest loop.
5. What should an `if` condition evaluate to?
   Answer: A truthy or falsy value that Python can use as a boolean decision.

## Unit 4: Functions and Scope

Functions package reusable behavior. A function can receive parameters, compute a result, and send that result back with `return`. Local variables created inside a function are normally available only during that function call. A good function usually does one clear job, which makes it easier to test and reuse. A short docstring should explain purpose, important inputs, and returned results when they are not obvious.

Practice quiz:

1. Which keyword defines a function?
   Answer: `def`.
2. What does `return` do?
   Answer: It sends a value back to the caller.
3. Why should a function usually do one clear job?
   Answer: It becomes easier to read, reuse, test, and change without affecting unrelated behavior.
4. Where is a local variable created inside a function normally available?
   Answer: Inside that function call.
5. What should a short docstring explain?
   Answer: What the function does, important arguments, and the returned result when that is not obvious.

## Unit 5: Data Structures

Lists, tuples, dictionaries, and sets help model collections. Lists preserve order and are mutable. Tuples are immutable once created. Dictionaries store key-value pairs and are useful for lookup and counting. Sets store unique items and support membership checks. A list comprehension builds a new list from an iterable using a compact expression and can include a filter.

Practice quiz:

1. Which data structure stores key-value pairs?
   Answer: `dict`.
2. Which collection automatically keeps unique items?
   Answer: `set`.
3. What does a list comprehension help you do?
   Answer: Build a new list from an iterable using a compact expression and optional filter.
4. Which collection is immutable once created?
   Answer: `tuple`.
5. Why is a dictionary useful for counting items?
   Answer: Each item can be a key and its count can be updated as the value.

## Unit 6: Files and Exceptions

Programs often need to read and write files. `with open(...)` is recommended because it closes files automatically. File modes such as `r`, `w`, and `a` control whether code reads, replaces, or appends content. Exceptions should be handled specifically so unrelated bugs are not hidden. JSON is a common text format for structured data, and Python's standard `json` module can parse and produce it.

Practice quiz:

1. Why is `with open(...)` recommended for files?
   Answer: It closes the file automatically.
2. Which mode opens a text file for writing and replaces existing content?
   Answer: `w`.
3. Why should exception handlers catch specific exception types?
   Answer: Specific handlers avoid hiding unrelated bugs and make recovery logic clearer.
4. Which standard module is commonly used to parse JSON text?
   Answer: `json`.
5. What is one useful thing to include in an error message for a file operation?
   Answer: The file path or operation being attempted so the user can fix the problem.

## Unit 7: Object-Oriented Programming

Classes combine state and behavior. The `__init__` method initializes a new object, and `self` usually refers to the current object inside instance methods. Classes are useful when data and related behavior should travel together behind clear methods. Inheritance can reuse and specialize behavior from a base class. Composition can be simpler when objects can be built from smaller collaborators without a deep hierarchy.

Practice quiz:

1. Which method initializes a new object?
   Answer: `__init__`.
2. What does `self` usually refer to in an instance method?
   Answer: The current object.
3. When is a class a better fit than a plain dictionary?
   Answer: When data and related behavior should travel together behind clear methods.
4. What does inheritance let a subclass do?
   Answer: Reuse and specialize behavior from a base class.
5. Why can composition be simpler than deep inheritance?
   Answer: Objects can be built from smaller collaborators without coupling everything to a large class hierarchy.

## Unit 8: Modules, Packages, and Environments

Modules organize Python code across files. `import math` loads the standard `math` module, and projects can import their own modules too. `pip` installs packages. A virtual environment isolates dependencies for one project so it does not depend on global machine state. Recording dependencies helps teammates and deployment systems recreate the same environment.

Practice quiz:

1. Which statement imports the `math` module?
   Answer: `import math`.
2. What is a virtual environment used for?
   Answer: Isolating project dependencies.
3. Why should projects record package dependencies?
   Answer: Other developers and deployment systems can recreate the same environment reliably.
4. What is `pip` commonly used for?
   Answer: Installing Python packages.
5. What is the purpose of the `if __name__ == "__main__"` guard?
   Answer: It runs script-only code when the file is executed directly, not when it is imported.

## Unit 9: Testing and Debugging

Testing turns examples into repeatable checks. Assertions verify that expected conditions are true. Small focused failing tests make bugs easier to isolate. Edge cases are unusual but important inputs or boundary conditions. Debugging can use print statements, tracebacks, or tools such as `pdb` to pause execution for interactive inspection.

Practice quiz:

1. What does an assertion check in a test?
   Answer: That an expected condition is true.
2. What is an edge case?
   Answer: An unusual but important input or boundary condition.
3. Why should a failing test be small and focused?
   Answer: It points to the behavior that broke and makes the fix easier to verify.
4. Which tool can pause Python execution for interactive inspection?
   Answer: `pdb`.
5. What should you inspect in a traceback besides the final error line?
   Answer: The call stack and file line numbers that show how execution reached the failure.

## Unit 10: Working with APIs and Automation

Python scripts can automate repeated work and call HTTP APIs. A successful HTTP response often has a status code in the 200 range. Web APIs commonly return JSON data. API keys should be stored in environment variables instead of source code. When a request fails, a script should report a useful message and avoid treating missing or invalid data as valid.

Practice quiz:

1. What does an HTTP status code in the 200 range usually mean?
   Answer: The request succeeded.
2. Why are environment variables useful for API keys?
   Answer: They keep secrets out of source code.
3. What should a script do when an API request fails?
   Answer: Check the status or exception, report a useful message, and avoid treating missing data as valid.
4. Which data format do web APIs commonly return for Python scripts to parse?
   Answer: JSON.
5. Name one task a Python automation script can handle.
   Answer: Examples include renaming files, downloading reports, checking API data, sending reminders, or cleaning CSV rows.
