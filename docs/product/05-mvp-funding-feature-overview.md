# Sightline MVP - Funding Feature Overview

## Executive Summary

Sightline is an AI-assisted academic platform built around one clear goal: help institutions protect exam integrity and support students earlier, without turning AI into the final judge.

The MVP focuses on three high-value features:

1. Exam Alert System for reviewing uploaded exam videos.
2. ProcBot for lightweight browser monitoring during BLC quizzes.
3. RAG Course Chatbot for course-aware student learning support.

Together, these features create a practical, fundable product: institutions can review exam evidence faster, monitor online quiz anomalies with low-cost browser tools, and give students a study assistant grounded in real course materials.

## Why This MVP Matters

Universities face two connected problems. First, exam integrity work is still slow, manual, and inconsistent. Second, students often need academic help before teachers have time to identify who is struggling. Sightline addresses both sides with a responsible AI workflow:

- AI flags moments that need human review.
- Invigilators and teachers make the final decisions.
- Evidence and explanations stay attached to every alert or answer.
- The product can start small and grow into a larger academic intelligence platform.

This makes Sightline a strong MVP for funding because it proves value quickly while staying realistic, ethical, and deployable.

## Feature 1: Exam Alert System

### What It Does

The Exam Alert System helps invigilators review exam-room video evidence. Instead of watching long recordings manually, an invigilator uploads an exam video and Sightline analyzes the footage for reviewable events.

The system can flag suspicious patterns such as:

- repeated look-away behavior
- possible talking based on mouth movement
- unauthorized device or phone presence
- nearby-student context where relevant for human review

Each alert includes the key details needed for review:

- alert type
- timestamp
- confidence score
- short summary
- evidence snapshot or annotated frame
- linked exam session and uploaded video
- review status such as confirmed, dismissed, or follow-up

The important point is that Sightline does not declare a student guilty. It creates structured evidence so invigilators can make fair, faster, better-documented decisions.

### MVP User Value

For invigilators, this reduces the time spent manually scanning videos. For institutions, it creates a clear audit trail. For students, it supports a more consistent process because every alert is evidence-based and human-reviewed.

### Technology Used

The MVP uses a Django backend to store exam sessions, videos, alerts, evidence, and review actions. Uploaded videos are processed with OpenCV and an AI vision pipeline using Ultralytics YOLOv8, YOLO pose detection, ByteTrack tracking, and MediaPipe Face Mesh. The behavior engine scores repeated signals over time, adds cooldowns to reduce noisy alerts, and saves evidence snapshots for review.

The frontend is a Next.js dashboard where invigilators can upload videos, monitor analysis progress, and review alerts.

## Feature 2: ProcBot

### What It Does

ProcBot is the browser-monitoring feature for BLC quizzes. It is designed for online exams or quizzes where students use a browser instead of sitting in a physical exam hall.

When a student opens a BLC quiz, ProcBot activates inside the browser and monitors a small set of high-value signals:

- tab switching in realtime
- face missing from the camera view
- more than one person visible
- phone or unauthorized device visible

When an anomaly is detected, ProcBot sends an event to the platform and creates a dashboard alert with an evidence screenshot.

### MVP User Value

ProcBot gives institutions a practical online quiz monitoring layer without building a heavy proctoring operations center. It is lightweight, low-cost, and focused only on events that matter during a quiz.

It also helps Sightline cover both exam environments:

- uploaded classroom video for physical exams
- browser-side monitoring for online BLC quizzes

That combination makes the MVP more complete and more attractive for pilot funding.

### Technology Used

ProcBot is planned as a browser extension or browser-side monitoring module. It uses the browser Tab Visibility API for realtime tab-switch detection. For camera-based checks, it uses lightweight MediaPipe models at a 1-second cadence: BlazeFace for face missing and multi-person checks, and EfficientDet-Lite0 for phone detection.

Events are sent through a WebSocket flow to a FastAPI gateway, then persisted into the same alert and evidence model used by the main Sightline platform. This keeps the review experience consistent for invigilators.

## Feature 3: RAG Course Chatbot

### What It Does

The RAG Course Chatbot is a course-aware study assistant for students. Teachers can upload or enter course materials, organize them by unit, and let students ask questions about the course.

Unlike a general chatbot, this feature answers using the institution's own course content. It can help students:

- understand topics from uploaded course materials
- ask questions about units, chapters, and course outlines
- review notes, PDFs, documents, and teacher-provided text
- receive answers with citations back to course materials

This gives students support outside class hours while helping teachers reduce repeated basic questions.

### MVP User Value

The chatbot turns uploaded course materials into an interactive learning layer. It supports student success, encourages self-study, and gives the platform value beyond exam monitoring.

For funding, this is important because Sightline is not only an exam integrity product. It is also a student-support platform that can help reduce academic risk before the semester ends.

### Technology Used

The RAG chatbot uses Django models for course units, course materials, chat threads, and chat messages. Course materials are indexed into Qdrant for vector search. The system supports text, PDFs, DOCX files, URLs, and embedded resources. It uses LangChain and LangGraph for agent-style retrieval and thread memory, with Groq's Llama model for AI answers when configured.

If the AI provider is not configured during a demo, the system still has a fallback answer path using retrieved course material. This makes the MVP easier to demonstrate and safer for early pilots.

## Shared Platform Foundation

All three features run on the same Sightline platform foundation:

| Area | MVP Technology |
| --- | --- |
| Backend | Django, Django REST Framework, Django Channels |
| Frontend | Next.js, React, TypeScript |
| Database | SQLite for local MVP, PostgreSQL-ready for deployment |
| Async work | Celery and Redis-ready worker flow |
| Video AI | OpenCV, YOLOv8, YOLO pose, ByteTrack, MediaPipe |
| Browser monitoring | Tab Visibility API, MediaPipe, WebSocket, FastAPI gateway plan |
| RAG chatbot | Qdrant, LangChain, LangGraph, Groq Llama, pypdf, python-docx |
| Product roles | Admin, teacher, invigilator, student |

## MVP Demo Story

A strong funding demo can show the full product story in one flow:

1. Admin logs in and manages users, roles, courses, and exams.
2. Teacher creates a course and uploads course material.
3. Student opens the course chatbot and asks a question grounded in the uploaded material.
4. Student enrolls in a course and submits an exam attempt.
5. Invigilator uploads an exam video.
6. Sightline analyzes the video and creates alerts with evidence.
7. Invigilator reviews an alert and marks it confirmed, dismissed, or follow-up.
8. ProcBot is demonstrated or simulated for a BLC quiz anomaly such as tab switching.

This demo proves that Sightline can support the full academic exam workflow: learning support before the exam, exam participation during the exam, and fair review after the exam.

## Why Fund Sightline

Sightline deserves funding because it combines three things institutions need now:

- Responsible AI for exam integrity.
- Affordable browser monitoring for online quizzes.
- Course-grounded AI support for students.

The MVP is intentionally scoped so it can be shipped, tested, and piloted without waiting for a large enterprise build. It uses practical technologies, keeps human review central, and creates a foundation that can expand into deeper analytics, LMS integration, institutional reporting, and larger deployment.

The funding opportunity is not just to build another proctoring tool. It is to build a trusted academic intelligence platform that helps universities protect integrity, support students, and make evidence-based decisions.

## Success Metrics For The MVP

The first pilot can measure success using clear, funder-friendly outcomes:

- reduced time needed to review uploaded exam videos
- number of alerts reviewed with attached evidence
- ProcBot anomaly delivery time from browser event to dashboard alert
- percentage of chatbot answers grounded in course materials
- teacher and invigilator satisfaction during pilot use
- number of at-risk or confused students identified earlier through platform use

## Responsible AI Position

Sightline's AI assists, but humans decide. The platform is designed to create reviewable evidence, not automatic punishment. This is a key strength for adoption because universities need tools that are useful, explainable, and fair.
