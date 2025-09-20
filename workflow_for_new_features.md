### The "Remote-First" Migration Workflow

The goal is to treat your live Supabase database as the "source of truth" and use the Supabase CLI as a tool to pull changes from it, rather than pushing changes to it.

Here is the step-by-step process:

#### Step 1: Make Schema Changes Directly on the Supabase Dashboard

For any new feature or fix, make your database changes directly in the Supabase web interface. You have two great options here:

*   **The Table Editor:** For simple changes like adding a column, changing a data type, or adding a foreign key, the visual table editor is fast and easy.
*   **The SQL Editor:** For more complex changes like creating functions (like we did), updating policies, or writing complex queries, use the SQL Editor.

#### Step 2: Generate Migration Commands from the Dashboard

After you've made and saved your changes, you need to capture them locally. The Supabase dashboard simplifies this.

1.  Go to the **SQL Editor** in the Supabase dashboard.
2.  Find the query you just ran to make your schema changes.
3.  Right-click on the query and select **"Download as migration file"**. This will provide you with two terminal commands.

#### Step 3: Run the Migration Commands Locally

The two commands provided by the dashboard will handle the creation of the migration file for you.

1.  The first command typically echoes the SQL statement.
2.  The second command pipes that SQL into a new migration file within your `supabase/migrations` directory.

Run these commands in your local terminal to create the migration file that mirrors the changes you made remotely.

#### Step 4: Update Your TypeScript Types

Your database schema has changed, so your code's type definitions are now out of date. The Supabase CLI can generate new types directly from your **remote database**.

1.  In your terminal, run this command:

    ```bash
    npx supabase gen types typescript --project-id hvwkhgyololbbhqaslco > src/integrations/supabase/types.ts
    ```

    This command connects to your remote project, inspects the schema, and overwrites your local `types.ts` file with the new, correct types. This is a critical step to prevent type errors in your code and to give your AI agent the correct type information.

### Summary of the New Workflow

This "remote-first" workflow ensures your live database remains the single source of truth.

1.  **Develop Remotely**: Always make schema changes directly on the live Supabase dashboard first, using the Table or SQL Editor.
2.  **Generate and Run Commands**: Use the Supabase dashboard to generate the specific terminal commands needed to create a new migration file locally.
3.  **Update Types**: After syncing your migrations, regenerate your TypeScript types from the remote database to ensure your application's types match the database schema.

This process avoids the risk of pushing broken changes from a local environment and keeps your local setup perfectly synchronized with your remote database.

