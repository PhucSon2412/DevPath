/* =========================================================
   Roadmaps Data — 6 Complete Developer Roadmaps
   
   Architecture notes:
   - Node positions are in a virtual coordinate space (x, y)
   - The graph renderer scales these to SVG viewport
   - Each node has: id, label, type, position, description, resources
   - Edges connect nodes: { from, to }
   - Node types: 'milestone' | 'topic' | 'subtopic' | 'checkpoint'
   ========================================================= */

const NODE_TYPES = {
  MILESTONE: 'milestone',
  TOPIC: 'topic',
  SUBTOPIC: 'subtopic',
  CHECKPOINT: 'checkpoint',
};

// ─── Frontend Developer ─────────────────────────────────────
const frontendRoadmap = {
  id: 'frontend',
  title: 'Frontend Developer',
  description: 'Step by step guide to becoming a modern frontend developer in 2026',
  icon: 'Monitor',
  category: 'role',
  color: '#3b82f6',
  nodes: [
    {
      id: 'fe-start',
      label: 'Frontend Developer',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 0,
      description: 'A frontend developer creates the user interface of websites and web applications. They use HTML, CSS, and JavaScript to build responsive, accessible, and performant UIs.',
      resources: [
        { title: 'Frontend Developer Handbook', url: 'https://frontendmasters.com/guides/front-end-handbook/', type: 'article' },
        { title: 'What is Frontend Development?', url: 'https://www.youtube.com/watch?v=WG5ikvJ2TKA', type: 'video' },
      ]
    },
    {
      id: 'fe-internet',
      label: 'Internet',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 100,
      description: 'Understanding how the internet works is fundamental. Learn about HTTP/HTTPS, DNS, hosting, browsers, and how data travels across the web.',
      resources: [
        { title: 'How Does the Internet Work?', url: 'https://cs.fyi/guide/how-does-internet-work', type: 'article' },
        { title: 'The Internet Explained', url: 'https://www.vox.com/2014/6/16/18076282/the-internet', type: 'article' },
        { title: 'How the Internet Works in 5 Minutes', url: 'https://www.youtube.com/watch?v=7_LPdttKXPc', type: 'video' },
      ]
    },
    {
      id: 'fe-html',
      label: 'HTML',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 200,
      description: 'HTML (HyperText Markup Language) is the standard markup language for creating web pages. It defines the structure and content of a webpage using elements and tags.',
      resources: [
        { title: 'HTML Tutorial — W3Schools', url: 'https://www.w3schools.com/html/', type: 'article' },
        { title: 'MDN HTML Guide', url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML', type: 'documentation' },
        { title: 'HTML Full Course', url: 'https://www.youtube.com/watch?v=pQN-pnXPaVg', type: 'video' },
      ]
    },
    {
      id: 'fe-css',
      label: 'CSS',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 300,
      description: 'CSS (Cascading Style Sheets) is used to style and layout web pages — including colors, fonts, spacing, and responsive design. Master Flexbox, Grid, animations, and media queries.',
      resources: [
        { title: 'CSS Tutorial — W3Schools', url: 'https://www.w3schools.com/css/', type: 'article' },
        { title: 'Learn CSS — web.dev', url: 'https://web.dev/learn/css/', type: 'article' },
        { title: 'CSS Crash Course', url: 'https://www.youtube.com/watch?v=yfoY53QXEnI', type: 'video' },
      ]
    },
    {
      id: 'fe-js',
      label: 'JavaScript',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 400,
      description: 'JavaScript is the programming language of the web. Learn variables, data types, functions, DOM manipulation, event handling, async programming, ES6+ features, and more.',
      resources: [
        { title: 'JavaScript.info', url: 'https://javascript.info/', type: 'article' },
        { title: 'Eloquent JavaScript', url: 'https://eloquentjavascript.net/', type: 'article' },
        { title: 'JavaScript Crash Course', url: 'https://www.youtube.com/watch?v=hdI2bqOjy3c', type: 'video' },
      ]
    },
    {
      id: 'fe-vcs',
      label: 'Version Control (Git)',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 500,
      description: 'Git is a distributed version control system. Learn branching, merging, pull requests, and collaboration workflows using platforms like GitHub or GitLab.',
      resources: [
        { title: 'Git Handbook — GitHub', url: 'https://guides.github.com/introduction/git-handbook/', type: 'article' },
        { title: 'Learn Git Branching', url: 'https://learngitbranching.js.org/', type: 'article' },
        { title: 'Git & GitHub Crash Course', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk', type: 'video' },
      ]
    },
    {
      id: 'fe-npm',
      label: 'Package Managers',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 600,
      description: 'Package managers like npm and yarn help you install, manage, and share reusable code packages. Understand package.json, semantic versioning, and lockfiles.',
      resources: [
        { title: 'npm Documentation', url: 'https://docs.npmjs.com/', type: 'documentation' },
        { title: 'Yarn vs npm', url: 'https://www.sitepoint.com/yarn-vs-npm/', type: 'article' },
      ]
    },
    {
      id: 'fe-buildtools',
      label: 'Build Tools',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 600,
      description: 'Learn about module bundlers (Vite, Webpack), task runners, and build pipelines. Understand transpilation, tree-shaking, and code splitting.',
      resources: [
        { title: 'Vite Documentation', url: 'https://vitejs.dev/guide/', type: 'documentation' },
        { title: 'Webpack Getting Started', url: 'https://webpack.js.org/guides/getting-started/', type: 'documentation' },
      ]
    },
    {
      id: 'fe-framework',
      label: 'Frontend Frameworks',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 720,
      description: 'Master at least one modern frontend framework. React, Vue, and Angular are the most popular choices. They help you build complex, interactive UIs with component-based architecture.',
      resources: [
        { title: 'React Official Docs', url: 'https://react.dev/', type: 'documentation' },
        { title: 'Vue.js Guide', url: 'https://vuejs.org/guide/', type: 'documentation' },
        { title: 'Angular Tutorial', url: 'https://angular.io/tutorial', type: 'documentation' },
      ]
    },
    {
      id: 'fe-css-arch',
      label: 'CSS Architecture',
      type: NODE_TYPES.SUBTOPIC,
      x: 200, y: 830,
      description: 'Learn CSS methodologies (BEM, SMACSS), CSS-in-JS solutions (Styled Components, Emotion), and CSS frameworks (Tailwind CSS, Bootstrap) to write maintainable styles at scale.',
      resources: [
        { title: 'BEM Methodology', url: 'https://en.bem.info/methodology/', type: 'article' },
        { title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs', type: 'documentation' },
      ]
    },
    {
      id: 'fe-testing',
      label: 'Testing',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 830,
      description: 'Learn unit testing, integration testing, and end-to-end testing. Tools include Jest, Vitest, React Testing Library, Cypress, and Playwright.',
      resources: [
        { title: 'Jest Documentation', url: 'https://jestjs.io/docs/getting-started', type: 'documentation' },
        { title: 'Testing Library', url: 'https://testing-library.com/docs/', type: 'documentation' },
        { title: 'Test Driven Development', url: 'https://www.youtube.com/watch?v=Jv2uxzhPFl4', type: 'video' },
      ]
    },
    {
      id: 'fe-typescript',
      label: 'TypeScript',
      type: NODE_TYPES.SUBTOPIC,
      x: 600, y: 830,
      description: 'TypeScript adds static typing to JavaScript. Learn types, interfaces, generics, enums, and how TypeScript improves code quality and developer experience.',
      resources: [
        { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/', type: 'documentation' },
        { title: 'TypeScript for JS Programmers', url: 'https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html', type: 'article' },
      ]
    },
    {
      id: 'fe-ssr',
      label: 'SSR / SSG',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 940,
      description: 'Server-Side Rendering (SSR) and Static Site Generation (SSG) improve performance and SEO. Learn Next.js, Nuxt.js, or Astro for these patterns.',
      resources: [
        { title: 'Next.js Documentation', url: 'https://nextjs.org/docs', type: 'documentation' },
        { title: 'What is SSR?', url: 'https://www.youtube.com/watch?v=GQzn7XRdzKY', type: 'video' },
      ]
    },
    {
      id: 'fe-perf',
      label: 'Web Performance',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 940,
      description: 'Optimize loading speed, rendering performance, and Core Web Vitals. Learn about lazy loading, code splitting, image optimization, and caching strategies.',
      resources: [
        { title: 'Web Vitals — Google', url: 'https://web.dev/vitals/', type: 'article' },
        { title: 'Performance Optimization', url: 'https://developer.mozilla.org/en-US/docs/Web/Performance', type: 'documentation' },
      ]
    },
    {
      id: 'fe-a11y',
      label: 'Accessibility',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 1050,
      description: 'Make your websites accessible to all users, including those with disabilities. Learn ARIA, semantic HTML, keyboard navigation, and WCAG guidelines.',
      resources: [
        { title: 'MDN Accessibility Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility', type: 'documentation' },
        { title: 'A11y Project', url: 'https://www.a11yproject.com/', type: 'article' },
      ]
    },
    {
      id: 'fe-pwa',
      label: 'PWA',
      type: NODE_TYPES.SUBTOPIC,
      x: 550, y: 1050,
      description: 'Progressive Web Apps use modern web capabilities to deliver app-like experiences. Learn service workers, web manifests, push notifications, and offline support.',
      resources: [
        { title: 'PWA Guide — web.dev', url: 'https://web.dev/progressive-web-apps/', type: 'article' },
        { title: 'PWA Tutorial', url: 'https://www.youtube.com/watch?v=sFsRylCQblw', type: 'video' },
      ]
    },
    {
      id: 'fe-end',
      label: 'Keep Learning!',
      type: NODE_TYPES.CHECKPOINT,
      x: 400, y: 1150,
      description: 'Frontend development evolves rapidly. Stay up-to-date with the latest trends, tools and best practices. Contribute to open source, build projects, and never stop learning!',
      resources: [
        { title: 'Frontend Masters', url: 'https://frontendmasters.com/', type: 'article' },
        { title: 'CSS Tricks', url: 'https://css-tricks.com/', type: 'article' },
      ]
    },
  ],
  edges: [
    { from: 'fe-start', to: 'fe-internet' },
    { from: 'fe-internet', to: 'fe-html' },
    { from: 'fe-html', to: 'fe-css' },
    { from: 'fe-css', to: 'fe-js' },
    { from: 'fe-js', to: 'fe-vcs' },
    { from: 'fe-vcs', to: 'fe-npm' },
    { from: 'fe-vcs', to: 'fe-buildtools' },
    { from: 'fe-npm', to: 'fe-framework' },
    { from: 'fe-buildtools', to: 'fe-framework' },
    { from: 'fe-framework', to: 'fe-css-arch' },
    { from: 'fe-framework', to: 'fe-testing' },
    { from: 'fe-framework', to: 'fe-typescript' },
    { from: 'fe-css-arch', to: 'fe-ssr' },
    { from: 'fe-testing', to: 'fe-ssr' },
    { from: 'fe-testing', to: 'fe-perf' },
    { from: 'fe-typescript', to: 'fe-perf' },
    { from: 'fe-ssr', to: 'fe-a11y' },
    { from: 'fe-perf', to: 'fe-pwa' },
    { from: 'fe-a11y', to: 'fe-end' },
    { from: 'fe-pwa', to: 'fe-end' },
  ]
};

// ─── Backend Developer ──────────────────────────────────────
const backendRoadmap = {
  id: 'backend',
  title: 'Backend Developer',
  description: 'Step by step guide to becoming a modern backend developer in 2026',
  icon: 'Server',
  category: 'role',
  color: '#10b981',
  nodes: [
    {
      id: 'be-start',
      label: 'Backend Developer',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 0,
      description: 'A backend developer builds the server-side logic, APIs, and database systems that power applications. They handle data processing, authentication, and business logic.',
      resources: [
        { title: 'What is Backend Development?', url: 'https://www.codecademy.com/resources/blog/what-is-back-end/', type: 'article' },
      ]
    },
    {
      id: 'be-internet',
      label: 'Internet & Protocols',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 100,
      description: 'Understand HTTP/HTTPS, TCP/IP, DNS, REST, WebSockets, and how client-server communication works at a fundamental level.',
      resources: [
        { title: 'HTTP Overview — MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', type: 'documentation' },
        { title: 'How HTTPS Works', url: 'https://howhttps.works/', type: 'article' },
      ]
    },
    {
      id: 'be-language',
      label: 'Pick a Language',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 200,
      description: 'Choose a backend programming language: Python, JavaScript (Node.js), Java, Go, Rust, C#, or PHP. Each has its strengths and ecosystem.',
      resources: [
        { title: 'Node.js Getting Started', url: 'https://nodejs.org/en/docs/guides/getting-started-guide', type: 'documentation' },
        { title: 'Python Backend Development', url: 'https://realpython.com/tutorials/web-dev/', type: 'article' },
      ]
    },
    {
      id: 'be-vcs',
      label: 'Version Control (Git)',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 300,
      description: 'Master Git for version control. Learn branching strategies, merging, rebasing, and collaboration workflows.',
      resources: [
        { title: 'Pro Git Book', url: 'https://git-scm.com/book/en/v2', type: 'article' },
      ]
    },
    {
      id: 'be-db',
      label: 'Databases',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 400,
      description: 'Learn both relational (PostgreSQL, MySQL) and NoSQL (MongoDB, Redis) databases. Understand data modeling, indexing, queries, and transactions.',
      resources: [
        { title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com/', type: 'article' },
        { title: 'MongoDB University', url: 'https://university.mongodb.com/', type: 'article' },
        { title: 'Database Design Course', url: 'https://www.youtube.com/watch?v=ztHopE5Wnpc', type: 'video' },
      ]
    },
    {
      id: 'be-api',
      label: 'APIs',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 500,
      description: 'Design and build RESTful APIs and GraphQL endpoints. Learn API versioning, documentation (Swagger/OpenAPI), rate limiting, and authentication.',
      resources: [
        { title: 'REST API Tutorial', url: 'https://restfulapi.net/', type: 'article' },
        { title: 'GraphQL Tutorial', url: 'https://graphql.org/learn/', type: 'documentation' },
      ]
    },
    {
      id: 'be-auth',
      label: 'Authentication',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 600,
      description: 'Implement secure authentication and authorization. Learn JWT, OAuth 2.0, session management, password hashing, and multi-factor authentication.',
      resources: [
        { title: 'JWT Introduction', url: 'https://jwt.io/introduction', type: 'article' },
        { title: 'OAuth 2.0 Explained', url: 'https://www.youtube.com/watch?v=ZV5yTm4pT8g', type: 'video' },
      ]
    },
    {
      id: 'be-caching',
      label: 'Caching',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 600,
      description: 'Implement caching strategies with Redis, Memcached. Learn CDN caching, browser caching, server-side caching, and cache invalidation patterns.',
      resources: [
        { title: 'Redis Documentation', url: 'https://redis.io/docs/', type: 'documentation' },
        { title: 'Caching Strategies', url: 'https://aws.amazon.com/caching/', type: 'article' },
      ]
    },
    {
      id: 'be-security',
      label: 'Web Security',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 720,
      description: 'Protect against common vulnerabilities: XSS, CSRF, SQL Injection, CORS. Learn HTTPS, content security policies, and security headers.',
      resources: [
        { title: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', type: 'article' },
        { title: 'Web Security — MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/Security', type: 'documentation' },
      ]
    },
    {
      id: 'be-testing',
      label: 'Testing',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 720,
      description: 'Write unit tests, integration tests, and API tests. Learn testing frameworks, mocking, test coverage, and TDD/BDD approaches.',
      resources: [
        { title: 'Testing Node.js Apps', url: 'https://www.youtube.com/watch?v=Jv2uxzhPFl4', type: 'video' },
      ]
    },
    {
      id: 'be-docker',
      label: 'Containerization',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 830,
      description: 'Learn Docker for containerization. Understand images, containers, Docker Compose, and container orchestration basics.',
      resources: [
        { title: 'Docker Getting Started', url: 'https://docs.docker.com/get-started/', type: 'documentation' },
        { title: 'Docker Crash Course', url: 'https://www.youtube.com/watch?v=pg19Z8LL06w', type: 'video' },
      ]
    },
    {
      id: 'be-cicd',
      label: 'CI/CD',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 940,
      description: 'Set up continuous integration and continuous deployment pipelines. Learn GitHub Actions, Jenkins, GitLab CI, and automated deployment strategies.',
      resources: [
        { title: 'GitHub Actions Docs', url: 'https://docs.github.com/en/actions', type: 'documentation' },
      ]
    },
    {
      id: 'be-arch',
      label: 'Architecture Patterns',
      type: NODE_TYPES.SUBTOPIC,
      x: 550, y: 940,
      description: 'Learn microservices, monolithic, serverless, and event-driven architectures. Understand when to use each pattern and their trade-offs.',
      resources: [
        { title: 'Microservices Guide', url: 'https://martinfowler.com/microservices/', type: 'article' },
      ]
    },
    {
      id: 'be-end',
      label: 'Keep Learning!',
      type: NODE_TYPES.CHECKPOINT,
      x: 400, y: 1050,
      description: 'Backend development is vast. Explore message queues, search engines, design patterns, and system design to advance your career.',
      resources: [
        { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'article' },
      ]
    },
  ],
  edges: [
    { from: 'be-start', to: 'be-internet' },
    { from: 'be-internet', to: 'be-language' },
    { from: 'be-language', to: 'be-vcs' },
    { from: 'be-vcs', to: 'be-db' },
    { from: 'be-db', to: 'be-api' },
    { from: 'be-api', to: 'be-auth' },
    { from: 'be-api', to: 'be-caching' },
    { from: 'be-auth', to: 'be-security' },
    { from: 'be-caching', to: 'be-testing' },
    { from: 'be-security', to: 'be-docker' },
    { from: 'be-testing', to: 'be-docker' },
    { from: 'be-docker', to: 'be-cicd' },
    { from: 'be-docker', to: 'be-arch' },
    { from: 'be-cicd', to: 'be-end' },
    { from: 'be-arch', to: 'be-end' },
  ]
};

// ─── DevOps Engineer ────────────────────────────────────────
const devopsRoadmap = {
  id: 'devops',
  title: 'DevOps Engineer',
  description: 'Step by step guide to becoming a DevOps engineer in 2026',
  icon: 'GitBranch',
  category: 'role',
  color: '#8b5cf6',
  nodes: [
    {
      id: 'do-start',
      label: 'DevOps Engineer',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 0,
      description: 'DevOps engineers bridge development and operations, focusing on automation, CI/CD, infrastructure, and reliable software delivery.',
      resources: [
        { title: 'What is DevOps?', url: 'https://aws.amazon.com/devops/what-is-devops/', type: 'article' },
      ]
    },
    {
      id: 'do-linux',
      label: 'Linux & OS Concepts',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 100,
      description: 'Master Linux fundamentals: file system, permissions, processes, shell scripting, networking commands, and system administration.',
      resources: [
        { title: 'Linux Journey', url: 'https://linuxjourney.com/', type: 'article' },
        { title: 'Linux Command Line', url: 'https://www.youtube.com/watch?v=ZtqBQ68cfJc', type: 'video' },
      ]
    },
    {
      id: 'do-networking',
      label: 'Networking & Security',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 200,
      description: 'Understand TCP/IP, DNS, load balancing, firewalls, VPN, SSL/TLS, and network security fundamentals.',
      resources: [
        { title: 'Networking Fundamentals', url: 'https://www.youtube.com/watch?v=cNwEVYkx2Kk', type: 'video' },
      ]
    },
    {
      id: 'do-scripting',
      label: 'Scripting Language',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 300,
      description: 'Learn Bash, Python, or Go for automation scripts, tooling, and infrastructure management tasks.',
      resources: [
        { title: 'Bash Scripting Tutorial', url: 'https://www.freecodecamp.org/news/bash-scripting-tutorial-linux-shell-script-and-command-line-for-beginners/', type: 'article' },
      ]
    },
    {
      id: 'do-vcs',
      label: 'Version Control (Git)',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 400,
      description: 'Master Git workflows, branching strategies (GitFlow, trunk-based), and collaboration on platforms like GitHub/GitLab.',
      resources: [
        { title: 'GitFlow Workflow', url: 'https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow', type: 'article' },
      ]
    },
    {
      id: 'do-containers',
      label: 'Containers (Docker)',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 500,
      description: 'Master Docker containerization: building images, managing containers, Docker Compose, networking, volumes, and multi-stage builds.',
      resources: [
        { title: 'Docker Documentation', url: 'https://docs.docker.com/', type: 'documentation' },
        { title: 'Docker Deep Dive', url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo', type: 'video' },
      ]
    },
    {
      id: 'do-cicd',
      label: 'CI/CD',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 600,
      description: 'Build automated pipelines for testing, building, and deploying code. Learn Jenkins, GitHub Actions, GitLab CI, ArgoCD.',
      resources: [
        { title: 'CI/CD Concepts', url: 'https://www.redhat.com/en/topics/devops/what-is-ci-cd', type: 'article' },
      ]
    },
    {
      id: 'do-iac',
      label: 'Infrastructure as Code',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 720,
      description: 'Manage infrastructure using code with Terraform, Ansible, Pulumi, or CloudFormation. Learn declarative vs imperative approaches.',
      resources: [
        { title: 'Terraform Getting Started', url: 'https://developer.hashicorp.com/terraform/tutorials', type: 'documentation' },
      ]
    },
    {
      id: 'do-k8s',
      label: 'Kubernetes',
      type: NODE_TYPES.MILESTONE,
      x: 550, y: 720,
      description: 'Learn container orchestration with Kubernetes: pods, services, deployments, ConfigMaps, Secrets, Helm charts, and cluster management.',
      resources: [
        { title: 'Kubernetes Documentation', url: 'https://kubernetes.io/docs/home/', type: 'documentation' },
        { title: 'Kubernetes Crash Course', url: 'https://www.youtube.com/watch?v=s_o8dwzRlu4', type: 'video' },
      ]
    },
    {
      id: 'do-cloud',
      label: 'Cloud Providers',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 830,
      description: 'Learn at least one major cloud platform: AWS, GCP, or Azure. Understand compute, storage, networking, and managed services.',
      resources: [
        { title: 'AWS Free Tier', url: 'https://aws.amazon.com/free/', type: 'article' },
      ]
    },
    {
      id: 'do-monitoring',
      label: 'Monitoring & Logging',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 830,
      description: 'Set up monitoring (Prometheus, Grafana, Datadog), logging (ELK Stack, Loki), and alerting for production systems.',
      resources: [
        { title: 'Prometheus Docs', url: 'https://prometheus.io/docs/introduction/overview/', type: 'documentation' },
      ]
    },
    {
      id: 'do-end',
      label: 'Keep Learning!',
      type: NODE_TYPES.CHECKPOINT,
      x: 400, y: 940,
      description: 'DevOps is constantly evolving. Explore GitOps, platform engineering, chaos engineering, and SRE practices.',
      resources: [
        { title: 'Google SRE Book', url: 'https://sre.google/sre-book/table-of-contents/', type: 'article' },
      ]
    },
  ],
  edges: [
    { from: 'do-start', to: 'do-linux' },
    { from: 'do-linux', to: 'do-networking' },
    { from: 'do-networking', to: 'do-scripting' },
    { from: 'do-scripting', to: 'do-vcs' },
    { from: 'do-vcs', to: 'do-containers' },
    { from: 'do-containers', to: 'do-cicd' },
    { from: 'do-cicd', to: 'do-iac' },
    { from: 'do-cicd', to: 'do-k8s' },
    { from: 'do-iac', to: 'do-cloud' },
    { from: 'do-k8s', to: 'do-monitoring' },
    { from: 'do-cloud', to: 'do-end' },
    { from: 'do-monitoring', to: 'do-end' },
  ]
};

// ─── React Developer ────────────────────────────────────────
const reactRoadmap = {
  id: 'react',
  title: 'React Developer',
  description: 'Step by step guide to becoming a React developer in 2026',
  icon: 'Atom',
  category: 'skill',
  color: '#06b6d4',
  nodes: [
    {
      id: 'rc-start',
      label: 'React Developer',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 0,
      description: 'React is a JavaScript library for building user interfaces. Learn to build modern, component-based web applications with React.',
      resources: [
        { title: 'React Official Docs', url: 'https://react.dev/', type: 'documentation' },
      ]
    },
    {
      id: 'rc-prereq',
      label: 'Prerequisites',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 100,
      description: 'Before learning React, ensure you have a solid understanding of HTML, CSS, JavaScript (ES6+), and basic Git.',
      resources: [
        { title: 'JavaScript for React', url: 'https://react.dev/learn/javascript-in-jsx-with-curly-braces', type: 'article' },
      ]
    },
    {
      id: 'rc-components',
      label: 'Components & JSX',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 200,
      description: 'Learn how to create functional components, use JSX syntax, pass props, handle children, and compose components together.',
      resources: [
        { title: 'Your First Component', url: 'https://react.dev/learn/your-first-component', type: 'documentation' },
        { title: 'React Components Explained', url: 'https://www.youtube.com/watch?v=Y2hgEGPzTZY', type: 'video' },
      ]
    },
    {
      id: 'rc-state',
      label: 'State & Events',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 300,
      description: 'Learn useState, event handling, conditional rendering, list rendering, and how React re-renders components.',
      resources: [
        { title: 'State: A Component\'s Memory', url: 'https://react.dev/learn/state-a-components-memory', type: 'documentation' },
      ]
    },
    {
      id: 'rc-hooks',
      label: 'Hooks',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 400,
      description: 'Master useEffect, useContext, useRef, useMemo, useCallback, useReducer, and custom hooks for reusable logic.',
      resources: [
        { title: 'Built-in React Hooks', url: 'https://react.dev/reference/react', type: 'documentation' },
        { title: 'React Hooks Explained', url: 'https://www.youtube.com/watch?v=TNhaISOUy6Q', type: 'video' },
      ]
    },
    {
      id: 'rc-routing',
      label: 'Routing',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 500,
      description: 'Implement client-side routing with React Router. Learn nested routes, dynamic routes, route parameters, and navigation guards.',
      resources: [
        { title: 'React Router Docs', url: 'https://reactrouter.com/', type: 'documentation' },
      ]
    },
    {
      id: 'rc-forms',
      label: 'Forms & Validation',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 500,
      description: 'Handle forms with controlled/uncontrolled components. Use libraries like React Hook Form, Formik, or Zod for validation.',
      resources: [
        { title: 'React Hook Form', url: 'https://react-hook-form.com/', type: 'documentation' },
      ]
    },
    {
      id: 'rc-statemgmt',
      label: 'State Management',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 620,
      description: 'Learn global state management with Context API, Redux Toolkit, Zustand, or Jotai. Understand when to use which solution.',
      resources: [
        { title: 'Redux Toolkit Docs', url: 'https://redux-toolkit.js.org/', type: 'documentation' },
        { title: 'Zustand', url: 'https://zustand-demo.pmnd.rs/', type: 'documentation' },
      ]
    },
    {
      id: 'rc-api',
      label: 'API Integration',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 620,
      description: 'Fetch data from APIs using fetch, axios, or React Query (TanStack Query). Handle loading states, errors, and caching.',
      resources: [
        { title: 'TanStack Query', url: 'https://tanstack.com/query/', type: 'documentation' },
      ]
    },
    {
      id: 'rc-styling',
      label: 'Styling Solutions',
      type: NODE_TYPES.SUBTOPIC,
      x: 250, y: 740,
      description: 'Style React apps with CSS Modules, Styled Components, Tailwind CSS, or CSS-in-JS libraries. Learn component-level styling patterns.',
      resources: [
        { title: 'Styled Components', url: 'https://styled-components.com/', type: 'documentation' },
      ]
    },
    {
      id: 'rc-testing',
      label: 'Testing React',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 740,
      description: 'Test React components with Vitest, React Testing Library, and Cypress. Learn unit testing, snapshot testing, and E2E testing.',
      resources: [
        { title: 'Testing Library Docs', url: 'https://testing-library.com/docs/react-testing-library/intro/', type: 'documentation' },
      ]
    },
    {
      id: 'rc-nextjs',
      label: 'Next.js / Frameworks',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 860,
      description: 'Learn React meta-frameworks like Next.js for SSR, SSG, API routes, and full-stack React development.',
      resources: [
        { title: 'Next.js Documentation', url: 'https://nextjs.org/docs', type: 'documentation' },
        { title: 'Next.js Tutorial', url: 'https://www.youtube.com/watch?v=ZVnjOPwW4ZA', type: 'video' },
      ]
    },
    {
      id: 'rc-end',
      label: 'Keep Learning!',
      type: NODE_TYPES.CHECKPOINT,
      x: 400, y: 960,
      description: 'Explore React Server Components, Suspense, concurrent features, React Native for mobile, and contribute to the React ecosystem.',
      resources: [
        { title: 'React Blog', url: 'https://react.dev/blog', type: 'article' },
      ]
    },
  ],
  edges: [
    { from: 'rc-start', to: 'rc-prereq' },
    { from: 'rc-prereq', to: 'rc-components' },
    { from: 'rc-components', to: 'rc-state' },
    { from: 'rc-state', to: 'rc-hooks' },
    { from: 'rc-hooks', to: 'rc-routing' },
    { from: 'rc-hooks', to: 'rc-forms' },
    { from: 'rc-routing', to: 'rc-statemgmt' },
    { from: 'rc-forms', to: 'rc-api' },
    { from: 'rc-statemgmt', to: 'rc-styling' },
    { from: 'rc-api', to: 'rc-testing' },
    { from: 'rc-styling', to: 'rc-nextjs' },
    { from: 'rc-testing', to: 'rc-nextjs' },
    { from: 'rc-nextjs', to: 'rc-end' },
  ]
};

// ─── Python Developer ───────────────────────────────────────
const pythonRoadmap = {
  id: 'python',
  title: 'Python Developer',
  description: 'Step by step guide to becoming a Python developer in 2026',
  icon: 'Code2',
  category: 'skill',
  color: '#f59e0b',
  nodes: [
    {
      id: 'py-start',
      label: 'Python Developer',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 0,
      description: 'Python is a versatile, high-level programming language used in web development, data science, AI/ML, automation, and more.',
      resources: [
        { title: 'Python Official Tutorial', url: 'https://docs.python.org/3/tutorial/', type: 'documentation' },
        { title: 'Python for Beginners', url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc', type: 'video' },
      ]
    },
    {
      id: 'py-basics',
      label: 'Python Basics',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 100,
      description: 'Learn syntax, variables, data types, operators, control flow (if/else, loops), functions, and basic I/O operations.',
      resources: [
        { title: 'Python Basics — Real Python', url: 'https://realpython.com/python-basics/', type: 'article' },
      ]
    },
    {
      id: 'py-ds',
      label: 'Data Structures',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 200,
      description: 'Master Python data structures: lists, tuples, dictionaries, sets, strings, and comprehensions. Learn when to use each one.',
      resources: [
        { title: 'Python Data Structures', url: 'https://docs.python.org/3/tutorial/datastructures.html', type: 'documentation' },
      ]
    },
    {
      id: 'py-oop',
      label: 'OOP in Python',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 300,
      description: 'Learn classes, objects, inheritance, polymorphism, encapsulation, decorators, abstract classes, and magic methods.',
      resources: [
        { title: 'OOP in Python — Real Python', url: 'https://realpython.com/python3-object-oriented-programming/', type: 'article' },
      ]
    },
    {
      id: 'py-modules',
      label: 'Modules & Packages',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 400,
      description: 'Organize code with modules and packages. Learn pip, virtual environments (venv, Poetry), and dependency management.',
      resources: [
        { title: 'Python Modules', url: 'https://docs.python.org/3/tutorial/modules.html', type: 'documentation' },
      ]
    },
    {
      id: 'py-errors',
      label: 'Error Handling',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 400,
      description: 'Handle exceptions with try/except, create custom exceptions, understand the exception hierarchy, and use context managers.',
      resources: [
        { title: 'Python Exceptions', url: 'https://docs.python.org/3/tutorial/errors.html', type: 'documentation' },
      ]
    },
    {
      id: 'py-files',
      label: 'File Handling & I/O',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 520,
      description: 'Read and write files, work with JSON/CSV/XML, handle file paths with pathlib, and process data streams.',
      resources: [
        { title: 'Reading & Writing Files', url: 'https://realpython.com/read-write-files-python/', type: 'article' },
      ]
    },
    {
      id: 'py-advanced',
      label: 'Advanced Python',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 520,
      description: 'Learn generators, iterators, closures, decorators, metaclasses, async/await, and concurrency (threading, multiprocessing).',
      resources: [
        { title: 'Advanced Python — Real Python', url: 'https://realpython.com/tutorials/advanced/', type: 'article' },
      ]
    },
    {
      id: 'py-web',
      label: 'Web Frameworks',
      type: NODE_TYPES.MILESTONE,
      x: 250, y: 640,
      description: 'Build web applications with Django or Flask/FastAPI. Learn routing, templates, middleware, ORM, and REST API development.',
      resources: [
        { title: 'Django Documentation', url: 'https://docs.djangoproject.com/', type: 'documentation' },
        { title: 'FastAPI Documentation', url: 'https://fastapi.tiangolo.com/', type: 'documentation' },
      ]
    },
    {
      id: 'py-datascience',
      label: 'Data Science',
      type: NODE_TYPES.SUBTOPIC,
      x: 550, y: 640,
      description: 'Explore NumPy, Pandas, Matplotlib, and Jupyter for data analysis and visualization. Gateway to machine learning and AI.',
      resources: [
        { title: 'Pandas Documentation', url: 'https://pandas.pydata.org/docs/', type: 'documentation' },
        { title: 'Data Science with Python', url: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI', type: 'video' },
      ]
    },
    {
      id: 'py-testing',
      label: 'Testing',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 760,
      description: 'Write tests with pytest, unittest, and mock. Learn test coverage, parametrize, fixtures, and TDD in Python.',
      resources: [
        { title: 'pytest Documentation', url: 'https://docs.pytest.org/', type: 'documentation' },
      ]
    },
    {
      id: 'py-deploy',
      label: 'Deployment',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 760,
      description: 'Deploy Python applications with Docker, Gunicorn/Uvicorn, CI/CD pipelines, and cloud platforms (AWS, Heroku, Fly.io).',
      resources: [
        { title: 'Deploying Python Apps', url: 'https://realpython.com/tutorials/deployment/', type: 'article' },
      ]
    },
    {
      id: 'py-end',
      label: 'Keep Learning!',
      type: NODE_TYPES.CHECKPOINT,
      x: 400, y: 870,
      description: 'Python has a vast ecosystem. Explore machine learning (scikit-learn, PyTorch), automation, DevOps, and more.',
      resources: [
        { title: 'Awesome Python', url: 'https://github.com/vinta/awesome-python', type: 'article' },
      ]
    },
  ],
  edges: [
    { from: 'py-start', to: 'py-basics' },
    { from: 'py-basics', to: 'py-ds' },
    { from: 'py-ds', to: 'py-oop' },
    { from: 'py-oop', to: 'py-modules' },
    { from: 'py-oop', to: 'py-errors' },
    { from: 'py-modules', to: 'py-files' },
    { from: 'py-errors', to: 'py-advanced' },
    { from: 'py-files', to: 'py-web' },
    { from: 'py-advanced', to: 'py-datascience' },
    { from: 'py-web', to: 'py-testing' },
    { from: 'py-datascience', to: 'py-deploy' },
    { from: 'py-testing', to: 'py-end' },
    { from: 'py-deploy', to: 'py-end' },
  ]
};

// ─── Full Stack Developer ───────────────────────────────────
const fullstackRoadmap = {
  id: 'fullstack',
  title: 'Full Stack Developer',
  description: 'Step by step guide to becoming a full stack developer in 2026',
  icon: 'Layers',
  category: 'role',
  color: '#ec4899',
  nodes: [
    {
      id: 'fs-start',
      label: 'Full Stack Developer',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 0,
      description: 'A full stack developer works on both frontend and backend of applications. They handle everything from UI to databases and deployment.',
      resources: [
        { title: 'Full Stack Developer Guide', url: 'https://www.w3schools.com/whatis/whatis_fullstack.asp', type: 'article' },
      ]
    },
    {
      id: 'fs-html-css',
      label: 'HTML & CSS',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 100,
      description: 'Build the structure and styling of web pages. Learn semantic HTML, Flexbox, Grid, responsive design, and CSS animations.',
      resources: [
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn', type: 'documentation' },
      ]
    },
    {
      id: 'fs-js',
      label: 'JavaScript',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 200,
      description: 'Master JavaScript fundamentals including ES6+, async programming, DOM manipulation, and the event loop.',
      resources: [
        { title: 'JavaScript.info', url: 'https://javascript.info/', type: 'article' },
      ]
    },
    {
      id: 'fs-git',
      label: 'Git & GitHub',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 300,
      description: 'Version control with Git. Learn commits, branches, merging, pull requests, and collaborative development workflows.',
      resources: [
        { title: 'GitHub Skills', url: 'https://skills.github.com/', type: 'article' },
      ]
    },
    {
      id: 'fs-frontend',
      label: 'Frontend Framework',
      type: NODE_TYPES.MILESTONE,
      x: 250, y: 420,
      description: 'Pick a frontend framework: React, Vue, or Angular. Learn component architecture, state management, and routing.',
      resources: [
        { title: 'React Docs', url: 'https://react.dev/', type: 'documentation' },
      ]
    },
    {
      id: 'fs-backend',
      label: 'Backend Language',
      type: NODE_TYPES.MILESTONE,
      x: 550, y: 420,
      description: 'Choose Node.js (Express), Python (Django/Flask), or another backend technology. Learn server-side development.',
      resources: [
        { title: 'Express.js Guide', url: 'https://expressjs.com/en/starter/installing.html', type: 'documentation' },
      ]
    },
    {
      id: 'fs-api',
      label: 'REST APIs',
      type: NODE_TYPES.TOPIC,
      x: 400, y: 540,
      description: 'Design and build RESTful APIs. Connect your frontend to backend services. Learn authentication, error handling, and API design.',
      resources: [
        { title: 'REST API Best Practices', url: 'https://restfulapi.net/', type: 'article' },
      ]
    },
    {
      id: 'fs-db',
      label: 'Databases',
      type: NODE_TYPES.MILESTONE,
      x: 400, y: 640,
      description: 'Work with SQL (PostgreSQL) and NoSQL (MongoDB) databases. Learn data modeling, ORMs (Prisma, Sequelize), and migrations.',
      resources: [
        { title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com/', type: 'article' },
        { title: 'Prisma Documentation', url: 'https://www.prisma.io/docs/', type: 'documentation' },
      ]
    },
    {
      id: 'fs-auth',
      label: 'Authentication',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 760,
      description: 'Implement user authentication with JWT, OAuth, sessions, and third-party auth providers (Auth0, Firebase Auth).',
      resources: [
        { title: 'Authentication Guide', url: 'https://www.youtube.com/watch?v=7Q17ubqLfaM', type: 'video' },
      ]
    },
    {
      id: 'fs-deploy',
      label: 'Deployment',
      type: NODE_TYPES.TOPIC,
      x: 550, y: 760,
      description: 'Deploy full stack apps to the cloud. Learn Docker, CI/CD, Vercel, Railway, AWS, and production best practices.',
      resources: [
        { title: 'Vercel Documentation', url: 'https://vercel.com/docs', type: 'documentation' },
      ]
    },
    {
      id: 'fs-testing',
      label: 'Testing',
      type: NODE_TYPES.TOPIC,
      x: 250, y: 870,
      description: 'Write full stack tests: unit, integration, and E2E. Learn Jest, Vitest, Cypress, and API testing with Postman.',
      resources: [
        { title: 'Testing JavaScript', url: 'https://testingjavascript.com/', type: 'article' },
      ]
    },
    {
      id: 'fs-perf',
      label: 'Performance & Security',
      type: NODE_TYPES.SUBTOPIC,
      x: 550, y: 870,
      description: 'Optimize performance with caching, CDN, lazy loading. Secure apps against OWASP Top 10 vulnerabilities.',
      resources: [
        { title: 'Web Security Basics', url: 'https://developer.mozilla.org/en-US/docs/Web/Security', type: 'documentation' },
      ]
    },
    {
      id: 'fs-end',
      label: 'Keep Learning!',
      type: NODE_TYPES.CHECKPOINT,
      x: 400, y: 980,
      description: 'Full stack development is broad. Explore TypeScript, microservices, real-time apps (WebSockets), and mobile development.',
      resources: [
        { title: 'Full Stack Open', url: 'https://fullstackopen.com/', type: 'article' },
      ]
    },
  ],
  edges: [
    { from: 'fs-start', to: 'fs-html-css' },
    { from: 'fs-html-css', to: 'fs-js' },
    { from: 'fs-js', to: 'fs-git' },
    { from: 'fs-git', to: 'fs-frontend' },
    { from: 'fs-git', to: 'fs-backend' },
    { from: 'fs-frontend', to: 'fs-api' },
    { from: 'fs-backend', to: 'fs-api' },
    { from: 'fs-api', to: 'fs-db' },
    { from: 'fs-db', to: 'fs-auth' },
    { from: 'fs-db', to: 'fs-deploy' },
    { from: 'fs-auth', to: 'fs-testing' },
    { from: 'fs-deploy', to: 'fs-perf' },
    { from: 'fs-testing', to: 'fs-end' },
    { from: 'fs-perf', to: 'fs-end' },
  ]
};

// ─── Export All Roadmaps ────────────────────────────────────
export const roadmaps = [
  frontendRoadmap,
  backendRoadmap,
  devopsRoadmap,
  reactRoadmap,
  pythonRoadmap,
  fullstackRoadmap,
];

export const getRoadmapById = (id) => roadmaps.find(r => r.id === id);

export { NODE_TYPES };
