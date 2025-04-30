# WhaleScale Architecture Explanation

## Overview

This document explains the architecture diagram for the WhaleScale application, which is designed to analyze and measure whales from images and sensor data. The architecture follows a modern client-server model with clear separation of concerns.

## Key Components

### Client Layer
The application is accessed through a browser-based interface that allows researchers to upload images, configure measurements, and view results.

### NGINX Reverse Proxy
NGINX serves as the entry point to the application, handling:
- Static content delivery for the frontend
- Routing API requests to the backend
- Security and request filtering
- Different configurations for development and production environments

### Frontend (React.js)
The frontend is built with React and organized into modular components:
- **Main React App**: Core application container that manages routing and state; combines all the different components
- **TopBar/Sidebar**: Navigation and context-specific controls
- **AuthModal**: User authentication interface
- **ImageViewer**: The primary tool for viewing and analyzing whale imagery
- **Data Component**: Visualization and management of measurement data
- **Help/About**: Documentation and application information

### Backend (Django)
The backend is built on Django and provides:
- RESTful API endpoints
- User authentication and authorization
- Data persistence and management
- Integration with the specialized whale measurement modules

### Core Whale Modules (MMI_CODEX)
The heart of the application consists of three specialized module groups:

1. **Collatrix**: Data collection and preprocessing
   - Body Condition: Multiple algorithms for calculating whale dimensions
   - Lidar Wrangle: Tools for processing different lidar sensor data types
   - PyExif Helper: Metadata extraction utilities

2. **Morphometrix**: Geometric measurement algorithms
   - Bezier curve fitting for whale outlines
   - Width calculation algorithms
   - Length and area computation tools
   - Angular measurements

3. **Xcertainty**: Statistical analysis and uncertainty quantification
   - Formatters: Standardized output generation
   - Models: Statistical modeling framework
   - Parsers: Data parsing tools
   - Samplers: Statistical sampling algorithms
   - Utility Functions: Supporting data processing tools

### Database
PostgreSQL provides data storage for the application, storing:
- User information
- Measurement data
- Analysis results

## Design Principles

1. **Modularity**: Each component has a specific, well-defined responsibility
2. **Extensibility**: New measurement techniques can be added without modifying existing code
3. **Separation of Concerns**: Clear boundaries between UI, application logic, and scientific algorithms

## Implementation Notes

- Docker containers are used for consistent deployment across environments
- Development and production configurations are managed through separate Docker Compose files
- The frontend communicates with the backend through RESTful API calls
- Core measurement algorithms are implemented as Python modules for scientific accuracy and performance