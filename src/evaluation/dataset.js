// Evaluation Dataset: 10 real product prompts + 10 edge cases
export const realPrompts = [
  {
    id: 'crm-01',
    name: 'CRM with Payments',
    prompt: 'Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics.',
    expectedEntities: ['user', 'contact', 'plan', 'payment'],
    expectedRoles: ['user', 'admin'],
    expectedPages: 4
  },
  {
    id: 'ecom-01',
    name: 'E-Commerce Store',
    prompt: 'Create an online store with product listings, shopping cart, checkout with Stripe, user accounts, order tracking, and admin panel for inventory management.',
    expectedEntities: ['user', 'product', 'cart', 'order'],
    expectedRoles: ['customer', 'admin'],
    expectedPages: 5
  },
  {
    id: 'saas-01',
    name: 'Project Management SaaS',
    prompt: 'Build a project management tool like Trello. Users can create boards, lists, and cards. Support team workspaces, member invitations, due dates, labels, and activity logs.',
    expectedEntities: ['user', 'board', 'list', 'card'],
    expectedRoles: ['member', 'admin'],
    expectedPages: 4
  },
  {
    id: 'social-01',
    name: 'Social Network',
    prompt: 'Create a social media platform where users can post text and images, follow other users, like and comment on posts, and have a personalized feed.',
    expectedEntities: ['user', 'post', 'comment'],
    expectedRoles: ['user'],
    expectedPages: 4
  },
  {
    id: 'health-01',
    name: 'Healthcare App',
    prompt: 'Build a healthcare appointment system. Patients can book appointments with doctors, view medical records, and receive prescription notifications. Doctors manage their schedule. Admin manages the clinic.',
    expectedEntities: ['user', 'appointment', 'doctor'],
    expectedRoles: ['patient', 'doctor', 'admin'],
    expectedPages: 5
  },
  {
    id: 'edu-01',
    name: 'Learning Platform',
    prompt: 'Create an online learning platform with courses, lessons, quizzes, student progress tracking, instructor dashboards, and certificate generation upon completion.',
    expectedEntities: ['user', 'course', 'lesson', 'quiz'],
    expectedRoles: ['student', 'instructor', 'admin'],
    expectedPages: 5
  },
  {
    id: 'hr-01',
    name: 'HR Management',
    prompt: 'Build an HR management system with employee profiles, leave management, attendance tracking, payroll, performance reviews, and department management.',
    expectedEntities: ['employee', 'leave', 'attendance'],
    expectedRoles: ['employee', 'manager', 'hr-admin'],
    expectedPages: 6
  },
  {
    id: 'inv-01',
    name: 'Inventory System',
    prompt: 'Create an inventory management system for a warehouse. Track products, stock levels, suppliers, purchase orders, and sales orders. Alert when stock is low.',
    expectedEntities: ['product', 'supplier', 'order'],
    expectedRoles: ['staff', 'manager'],
    expectedPages: 4
  },
  {
    id: 'blog-01',
    name: 'Blog Platform',
    prompt: 'Build a blogging platform where writers can create and publish articles with rich text, categories, and tags. Readers can comment and bookmark. Editors can review and approve posts.',
    expectedEntities: ['user', 'article', 'category', 'comment'],
    expectedRoles: ['writer', 'editor', 'reader'],
    expectedPages: 5
  },
  {
    id: 'food-01',
    name: 'Food Delivery',
    prompt: 'Create a food delivery app like UberEats. Restaurants list menus, customers order food, drivers get delivery assignments. Real-time order tracking and ratings system.',
    expectedEntities: ['user', 'restaurant', 'menu', 'order'],
    expectedRoles: ['customer', 'restaurant-owner', 'driver', 'admin'],
    expectedPages: 5
  }
];

export const edgeCasePrompts = [
  {
    id: 'edge-vague-01',
    name: 'Extremely Vague',
    prompt: 'Make me an app',
    type: 'vague',
    expectedBehavior: 'Should ask for clarification or make documented assumptions'
  },
  {
    id: 'edge-conflict-01',
    name: 'Conflicting Requirements',
    prompt: 'Build a completely public app where everyone can see everything, but also add strict role-based access control where users can only see their own data.',
    type: 'conflicting',
    expectedBehavior: 'Should detect conflict and resolve with documented assumption'
  },
  {
    id: 'edge-incomplete-01',
    name: 'Incomplete Spec',
    prompt: 'I need a dashboard',
    type: 'incomplete',
    expectedBehavior: 'Should infer purpose and add reasonable defaults'
  },
  {
    id: 'edge-complex-01',
    name: 'Over-Complex',
    prompt: 'Build a platform that combines social media, e-commerce, project management, video streaming, real-time chat, AI-powered recommendations, blockchain payments, IoT device management, AR/VR experiences, and machine learning model training - all in one app.',
    type: 'over-complex',
    expectedBehavior: 'Should handle gracefully, possibly prioritizing core features'
  },
  {
    id: 'edge-jargon-01',
    name: 'Heavy Jargon',
    prompt: 'Need a B2B SaaS with SSO, RBAC, multi-tenancy, webhooks, rate limiting, and SOC2 compliance. API-first with GraphQL subscriptions.',
    type: 'jargon',
    expectedBehavior: 'Should correctly interpret all technical terms'
  },
  {
    id: 'edge-typo-01',
    name: 'Typos and Bad Grammar',
    prompt: 'bild me a ecommrce stor with produts, shoping cart, chekout and usr acounts. admin panle to manag inventroy.',
    type: 'typos',
    expectedBehavior: 'Should understand intent despite errors'
  },
  {
    id: 'edge-nonsense-01',
    name: 'Partial Nonsense',
    prompt: 'Build an app that manages unicorn inventories across parallel dimensions while also tracking employee schedules and project deadlines.',
    type: 'nonsense',
    expectedBehavior: 'Should focus on realistic parts and flag unrealistic ones'
  },
  {
    id: 'edge-single-01',
    name: 'Single Feature',
    prompt: 'I just need a login page.',
    type: 'minimal',
    expectedBehavior: 'Should create minimal but complete app with just auth'
  },
  {
    id: 'edge-implicit-01',
    name: 'Implicit Requirements',
    prompt: 'Build a marketplace for freelancers.',
    type: 'implicit',
    expectedBehavior: 'Should infer profiles, listings, messaging, payments, reviews'
  },
  {
    id: 'edge-contradict-01',
    name: 'Contradictory Auth',
    prompt: 'Create a system where all users are admins but some admins have limited access and regular users can delete admin accounts.',
    type: 'contradictory',
    expectedBehavior: 'Should resolve hierarchy contradiction with documented assumption'
  }
];

export const allPrompts = [...realPrompts, ...edgeCasePrompts];
