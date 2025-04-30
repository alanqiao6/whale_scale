# WhaleScale Architecture Design

## Overview

The WhaleScale architecture is designed to provide researchers with a web-based tool for analyzing and measuring whales from images and sensor data. The system follows modern software architecture principles with a clear separation of concerns, prioritizing scientific accuracy, extensibility, and ease of use. Below, we have listed some of our reasoning behind major design decisions made during development.

## Design Justifications

### Client-Server Separation

**Decision:** Implement a clear client-server architecture with separate frontend and backend codebases.

**Justification:** This separation provides several critical benefits:

1. **Flexibility in Development**: Frontend and backend teams can work independently, using specialized tools and frameworks for each domain. The React frontend leverages modern component-based architecture while the Django backend provides robust data handling and scientific algorithm integration. This allowed for fluent additions to both sides during development.

2. **Scalability**: Each layer can be scaled independently based on usage patterns. For example, if measurement processing becomes a bottleneck, we could scale the backend services without modifying the frontend.

3. **Technology Evolution**: As new frontend or backend technologies emerge, either can be upgraded or replaced without disrupting the entire system. This was important given the previous system's difficulty with maintainability.

4. **Security**: Sensitive operations and data processing occur on the server, reducing exposure of proprietary measurement algorithms and user data.

### Frontend Framework Selection (React)

**Decision:** Use React for the frontend implementation.

**Justification:** We chose React because:

1. **Component Reusability**: The measurement interface requires many interactive components that can be reused across different views.

2. **Developer Familiarity**: As noted in the design justification document, the team had previous experience with React, reducing the learning curve and development time.

3. **Performance**: React's virtual DOM ensures efficient updates when displaying complex measurement data and visualizations.

4. **Ecosystem**: The rich ecosystem of charting libraries and image manipulation tools supports our specialized visualization needs.

### Backend Framework Selection (Django)

**Decision:** Use Django for the backend implementation.

**Justification:** Django was selected because:

1. **Python Compatibility**: The core whale measurement modules (CollatriX and MorphoMetrix) are Python-based. Django provides seamless integration with these modules without additional language translation layers.

2. **Built-in Features**: Django includes robust authentication, authorization, and admin interfaces, reducing development time for these standard components.

3. **REST Framework**: Django REST Framework offers simple implementation of API endpoints, crucial for communication with the React frontend.

### Core Module Integration (MMI_CODEX)

**Decision:** Organize core whale measurement functionality into three distinct module groups.

**Justification:**

1. **Domain Separation**: Each module handles a specific domain aspect:
   - Collatrix: Data collection and preprocessing
   - Morphometrix: Geometric measurement algorithms
   - Xcertainty: Statistical analysis and uncertainty quantification

2. **Extensibility**: This modular approach allows new measurement techniques to be added without modifying existing code. Researchers can implement new algorithms within the appropriate module.

3. **Scientific Validation**: Multiple measurement approaches enable cross-validation and comparison, critical for scientific accuracy.

4. **Technology Transfer**: Organizing the core functionality this way facilitates adoption of the same modules in other research applications beyond the web interface.

### Database Selection (PostgreSQL)

**Decision:** Use PostgreSQL for data storage rather than a simpler storage solution.

**Justification:**

1. **Data Relationships**: Measurements, users, and analysis results have complex relationships that benefit from a relational database structure.

2. **Query Performance**: PostgreSQL's advanced indexing capabilities ensure fast retrieval of measurement data, even as the dataset grows.

3. **Data Integrity**: Transaction support ensures measurement data remains consistent, critical for scientific research.

4. **Future Proofing**: While the design justification document initially indicated no database would be included, the final design incorporates PostgreSQL to support future growth and complexity, enabling features like:
   - User collaboration on measurements
   - Sharing and reviewing measurements between researchers
   - Long-term data aggregation for meta-analysis

### NGINX Implementation

**Decision:** Use NGINX as a reverse proxy in front of the application.

**Justification:**

1. **Security**: NGINX provides request filtering and security headers, reducing attack surface.

2. **Performance**: Static content delivery optimization improves frontend loading times.

3. **Deployment Flexibility**: Enables different configurations for development, staging, and production environments.

4. **Load Balancing**: As the application scales, NGINX can distribute load across multiple backend instances.

## Extensibility Design

The architecture was specifically designed to be extensible in several key areas:

1. **Measurement Algorithms**: New algorithms can be added to any of the three core modules without modifying existing code, allowing researchers to implement and compare novel approaches.

2. **User Interface Components**: The component-based React architecture allows new visualization or interaction tools to be added as discrete components.

3. **API Endpoints**: The Django REST Framework makes it simple to add new endpoints for additional functionality.

4. **Deployment Options**: The architecture supports multiple deployment scenarios:
   - dev Duke VCM
   - main Duke VCM

## Implementation Notes

1. **Docker Containerization**: All components are containerized for consistent deployment across environments, addressing the hosting requirements identified in the design justification document.

2. **Environment-Specific Configurations**: Development, staging, and production environments have separate configurations managed through Docker Compose.

3. **Stateless Design**: The backend services are designed to be stateless, enabling horizontal scaling as needed.

4. **API-First Approach**: All interactions between frontend and backend occur through well-defined API endpoints, enabling potential future mobile or desktop applications to use the same backend.

5. **Progressive Enhancement**: The interface is designed to work with varying levels of computational resources, from basic measurements to advanced statistical analysis.