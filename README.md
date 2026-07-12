# FTC Programming Atlas

> An interactive, node-based documentation platform for FTC programming, built to preserve team knowledge and make technical concepts easier to explore, understand, and teach.

## Live Demo

[Open FTC Programming Atlas](https://ftcprogrammingatlas.com)

## Overview

FTC Programming Atlas turns robotics documentation into an interactive visual map.

Instead of keeping knowledge in scattered files, chat messages, or long static documents, the platform organizes FTC programming concepts as connected nodes. Each node represents a topic such as TeleOp, Autonomous, PID control, Localization, Pedro Pathing, Road Runner, FTCLib, MeepMeep, Vision, FTC SDK, or Troubleshooting.

The goal is to create a long-term learning and documentation system that helps future team generations understand not only individual concepts, but also how those concepts connect.

## Why I Built It

In robotics teams, valuable technical knowledge is often lost between seasons. Important decisions, debugging experience, setup steps, and programming patterns may remain spread across old files, private messages, or unfinished notes.

I wanted to build a platform that:

- preserves programming knowledge between seasons
- makes onboarding easier for new programmers
- connects related concepts visually
- supports both learning and internal documentation
- can grow together with the team
- feels more intuitive than a traditional static wiki

FTC Programming Atlas is both a practical tool for robotics education and a portfolio project focused on product thinking, UI design, architecture, security, and maintainability.

## Main Features

### Interactive Atlas

- Node-based documentation map
- Labeled relationships between concepts
- Drag-and-drop node positioning
- Automatic overlap prevention
- Zoom, pan, fit view, reset view, and center selection
- Search across titles, content, categories, difficulties, and tags
- Strict filtering that hides unrelated nodes and edges

### Documentation Experience

- Full-screen topic viewer
- Single-click node opening
- Structured topic metadata
- Dynamic categories
- Dynamic difficulty levels
- Multiple tags per node
- Images, screenshots, uploaded videos, and external video links
- Public media gallery inside each topic
- Selectable and copyable code snippets
- Java, Python, Kotlin, C++, JavaScript, JSON, XML, Bash, and plain text examples

### Reader and Editor Modes

- Clean Reader Mode for visitors
- Separate Editor Mode for approved collaborators
- Editor-only controls hidden from public users
- Magic-link authentication through Supabase
- Server-side editor verification

### Content Management

- Create, edit, and delete nodes
- Create, edit, and delete relations
- Manage categories, difficulties, and tags directly from the website
- Reorder taxonomy items
- Activate or deactivate taxonomy items
- Safely replace categories or difficulties before deletion
- View how many nodes use each taxonomy item
- Upload, edit, reorder, and remove node media
- Create, edit, reorder, copy, and delete node code snippets

### Reliability and Security

- Supabase-backed cloud storage
- Atomic CRUD operations through PostgreSQL RPC functions
- Row Level Security and restricted write access
- Undo and redo history
- Loading, empty, error, and retry states
- Responsive desktop and mobile interactions
- Touch gestures for pan, pinch zoom, and long-press editing

## Example Topics

- TeleOp Basics
- FTC SDK
- PID and PIDF Control
- Autonomous Flow
- Pedro Pathing
- Road Runner
- Localization and Odometry
- FTCLib
- MeepMeep
- Vision and OpenCV
- Debugging Control Hub and Expansion Hub Issues

## Tech Stack

### Front End

- HTML
- CSS
- JavaScript

### Back End and Storage

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- PostgreSQL RPC functions
- Row Level Security

### Deployment

- GitHub
- Netlify

## How It Works

Each documentation topic is represented as a node on the atlas.

Users can:

- explore the map
- search and filter topics
- open full documentation
- follow relationships between concepts
- view screenshots and videos
- focus only on a selected category, difficulty, or tag

Approved editors can additionally:

- create and edit nodes
- connect topics through labeled relations
- reorganize the map
- manage categories, difficulties, and tags
- upload and manage media
- use undo and redo
- maintain the atlas without changing the source code for normal content updates

The result is closer to an interactive concept graph than to a traditional documentation website.

## Dynamic Taxonomy

The platform separates three different concepts:

- **Categories** — the main technical area, such as Pedro Pathing, FTC SDK, Road Runner, Control Loops, FTCLib, or Vision
- **Difficulties** — the learning level, such as Beginner, Intermediate, or Advanced
- **Tags** — reusable labels such as PID, Encoder, IMU, Feedforward, Odometry, or VisionProcessor

All three systems are dynamic and can be managed directly from the Taxonomy Manager.

## Media Support

Each node can include media such as:

- screenshots
- diagrams
- JPG, PNG, WEBP, and GIF images
- MP4, WebM, and MOV videos
- YouTube links
- direct video links

Editors can add titles and descriptions, reorder media, edit entries, and remove files directly from the website.

## Code Snippets

Each node can include one or more code examples with:

- a programming language
- a title
- an explanation
- selectable source code
- a one-click copy button
- editor-controlled ordering

The current editor supports Java, Python, Kotlin, C++, JavaScript, JSON, XML, Bash, and plain text. Snippets are stored in PostgreSQL and are loaded together with the rest of the node documentation.

## Project Structure

```text
FTC-Programming-Atlas/
├── index.html
├── atlas-script.js
├── README.md
```

The application is intentionally lightweight on the front end while using Supabase for authentication, database operations, history, taxonomy, and media storage.

## Current Status

FTC Programming Atlas is a working full-stack documentation platform.

The current version includes:

- cloud-synced nodes and relations
- secure authentication and editor permissions
- Reader Mode and Editor Mode
- dynamic categories, difficulties, and tags
- public filtering
- Taxonomy Manager
- node media uploads and video links
- undo and redo
- loading and retry states
- responsive desktop and mobile support
- copyable code snippets

The platform foundation is complete enough for real use. The main ongoing work is expanding and refining the FTC documentation content.

## Planned Improvements

Possible future additions include:

- Markdown support
- Java syntax highlighting
- learning paths
- prerequisites between topics
- deep links for individual nodes
- bookmarks and progress tracking
- compatibility information for FTC SDK and framework versions
- troubleshooting decision trees
- PWA and offline support
- multilingual documentation
- contribution review workflows
- analytics for searches with no results

## What This Project Demonstrates

This project highlights:

- front-end UI and interaction design
- JavaScript state management
- graph-based content organization
- Supabase authentication and storage
- PostgreSQL RPC design
- Row Level Security
- dynamic content management
- undo and redo systems
- responsive and touch-friendly UX
- product thinking for a real robotics team
- educational platform design

## Use Cases

FTC Programming Atlas can be used for:

- onboarding new FTC programmers
- preserving technical knowledge between seasons
- organizing framework-specific documentation
- teaching programming concepts visually
- documenting team-specific architecture and debugging experience
- creating a reusable internal robotics knowledge base

## Team

Created for **InfotronX #19119** as a long-term programming documentation and education platform.

## Author

Built by **Cristi** as a practical FTC team tool and portfolio project.

---

FTC Programming Atlas is an independent educational project and is not an official product of FIRST®.
