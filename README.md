# Text Editor Application

A collaborative text editing application that allows users to suggest changes to text files with GitHub integration.

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── profile/       # Profile-related components
│   │   ├── CreateRepositoryButton.tsx    # Button for creating new GitHub repos
│   │   ├── GitHubConnectionCard.tsx      # Card for managing GitHub connection
│   │   ├── RepositoryListItem.tsx        # Individual repository list item
│   │   ├── RepositoryManagementCard.tsx  # Card for managing repositories
│   │   ├── RepositoryPermissionsDialog.tsx # Dialog for repository permissions
│   │   ├── ScriptsCard.tsx              # Card displaying user's scripts
│   │   ├── ScriptsList.tsx              # List of scripts
│   │   └── UserProfileCard.tsx          # User profile information card
│   ├── TextEditor.tsx                   # Main text editor component
│   ├── SuggestionList.tsx              # List of text suggestions
│   └── ui/                             # shadcn/ui components
│
├── hooks/             # Custom React hooks
│   ├── use-mobile.tsx  # Hook for responsive design
│   └── use-toast.ts    # Toast notification hook
│
├── integrations/      # External service integrations
│   └── supabase/     # Supabase integration
│       ├── client.ts   # Supabase client configuration
│       └── types.ts    # TypeScript types for Supabase
│
├── lib/              # Utility functions and helpers
│   └── utils.ts      # General utility functions
│
└── pages/            # Application pages/routes
    ├── Auth.tsx      # Authentication page
    ├── Index.tsx     # Landing page
    ├── NotFound.tsx  # 404 page
    ├── Profile.tsx   # User profile page
    └── ScriptEdit.tsx # Script editing page

```

## Key Features

1. **Authentication**
   - Email/password authentication
   - GitHub OAuth integration
   - User profile management

2. **Text Editor**
   - Real-time text editing
   - Change suggestion system
   - Version control integration

3. **GitHub Integration**
   - Repository management
   - Public/private repository support
   - Permission management
   - Version control

4. **User Management**
   - User roles (Admin/Editor)
   - Profile customization
   - Permission management

## Database Structure

The application uses Supabase as its backend with the following main tables:

1. **profiles**
   - Stores user profile information
   - Links to Supabase auth users

2. **scripts**
   - Stores text documents
   - Manages public/private access

3. **script_suggestions**
   - Stores suggested changes
   - Tracks suggestion status

4. **github_repositories**
   - Manages GitHub repository connections
   - Handles repository metadata

5. **repository_permissions**
   - Manages repository access
   - Controls user permissions

## Getting Started

1. **Prerequisites**
   - Node.js & npm installed
   - GitHub account for repository integration
   - Supabase account for backend services

2. **Installation**
   ```bash
   # Clone the repository
   git clone <repository-url>

   # Install dependencies
   npm install

   # Start development server
   npm run dev
   ```

3. **Environment Setup**
   - Configure Supabase connection
   - Set up GitHub OAuth credentials
   - Configure authentication redirects

## Development Guidelines

1. **Component Structure**
   - Components are organized by feature
   - UI components use shadcn/ui library
   - Responsive design using Tailwind CSS

2. **State Management**
   - React Query for server state
   - React hooks for local state
   - Supabase real-time subscriptions

3. **TypeScript**
   - Strict type checking enabled
   - Interface definitions in types.ts
   - Type-safe database operations

## Deployment

The application can be deployed using various platforms:

1. **Using Lovable**
   - Visit [Lovable](https://lovable.dev/projects/fab83bae-3d08-42a4-a02c-820241046a96)
   - Click on Share -> Publish

2. **Custom Domain**
   - Follow [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/) guide
   - Deploy using Netlify or similar services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.