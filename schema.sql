-- SQL Script to set up JD-to-Resume Customizer tables and Row Level Security (RLS)

-- 1. PROFILES TABLE
-- Stores user information synced from Supabase Auth
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Allow users to view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Allow users to update their own profile" on public.profiles
  for update using (auth.uid() = id);


-- 2. RESUMES TABLE
-- Stores the original uploaded resumes (raw text and structured JSON)
create table public.resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  original_filename text not null,
  raw_text text not null,
  parsed_json jsonb not null, -- Contains structured { personalInfo, workExperience, projects, education, skills }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for resumes
alter table public.resumes enable row level security;

-- Policies for resumes
create policy "Allow users to view their own resumes" on public.resumes
  for select using (auth.uid() = user_id);

create policy "Allow users to insert their own resumes" on public.resumes
  for insert with check (auth.uid() = user_id);

create policy "Allow users to delete their own resumes" on public.resumes
  for delete using (auth.uid() = user_id);


-- 3. TAILORED RESUMES TABLE
-- Stores customized resume configurations, user-accepted changes, and target company metadata
create table public.tailored_resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  resume_id uuid references public.resumes on delete cascade not null,
  job_title text not null,
  company_name text not null,
  job_description text not null,
  tailored_json jsonb not null, -- Final compiled resume data incorporating accepted changes
  suggestions jsonb not null,  -- Stores all suggestions with accepted/rejected status and reasons
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for tailored resumes
alter table public.tailored_resumes enable row level security;

-- Policies for tailored resumes
create policy "Allow users to view their own tailored resumes" on public.tailored_resumes
  for select using (auth.uid() = user_id);

create policy "Allow users to insert their own tailored resumes" on public.tailored_resumes
  for insert with check (auth.uid() = user_id);

create policy "Allow users to update their own tailored resumes" on public.tailored_resumes
  for update using (auth.uid() = user_id);

create policy "Allow users to delete their own tailored resumes" on public.tailored_resumes
  for delete using (auth.uid() = user_id);


-- 4. PROFILE SYNC TRIGGER
-- Automatically creates a profile record when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
