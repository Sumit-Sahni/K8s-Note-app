# Notes: a Next.js frontend and a backend, built by GitHub Actions, run on minikube

The simplest real two-tier app, built to learn Docker, Kubernetes and CI/CD.

- **Frontend**: Next.js 16, React 19, TypeScript. A page where you add and delete notes.
- **Backend**: a small API on Node.js 26 (plain Node, nothing to install). It stores the notes.
- **Pipeline**: GitHub Actions builds both images and publishes them to GitHub's free registry.
- **Kubernetes**: minikube pulls those images and runs them.

```
Browser --> Frontend (Next.js) --> Backend (API)
            the only public one     private, only the frontend can reach it
```

When you click **Add**, the browser sends `POST /api/notes` to the frontend. Next.js passes it on to
the backend as `POST /notes` (see `rewrites` in `frontend/next.config.ts`). The backend saves the note.

## The big picture

```
git push --> GitHub Actions builds 2 images --> ghcr.io --> minikube pulls them --> pods run
```

## Files

| File | What it does |
|---|---|
| `backend/server.js` | the whole backend (about 60 lines) |
| `backend/Dockerfile` | packs the backend into an image |
| `frontend/src/app/page.tsx` | the page: input, Add button, list, Delete buttons |
| `frontend/next.config.ts` | passes `/api/...` calls on to the backend |
| `frontend/Dockerfile` | packs the frontend into an image |
| `.github/workflows/build.yml` | the pipeline: builds and publishes both images |
| `.github/dependabot.yml` | opens pull requests when newer versions exist |
| `k8s.yaml` | runs both on Kubernetes (2 Deployments and 2 Services) |
| `docker-compose.yml` | runs both on your laptop without Kubernetes |

## Editor shows red squiggles?

This almost always means the packages are not installed yet, so the editor can't find `react` or `next`.

```bash
cd frontend
npm install
```

Then open the **`frontend` folder** in your editor (not the parent folder), and run
**TypeScript: Restart TS Server** from the command palette. If red remains, run
**TypeScript: Select TypeScript Version** and choose **Use Workspace Version**.

You can also check types from the terminal. No output means no errors:
```bash
cd frontend
npm run typecheck
```

## Step 1: try it on your laptop first (Docker Compose)

```bash
docker compose up --build
```

Open http://localhost:3000. If port 3000 is busy, change `"3000:3000"` to `"3001:3000"` in
`docker-compose.yml` and open http://localhost:3001. Stop with `Ctrl+C`, then `docker compose down`.

## Step 2: push to GitHub so the pipeline builds the images

1. Create a **public** repo on github.com (no README), for example `notes-app`.
2. From this folder:
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/notes-app.git
   git push -u origin main
   ```
3. Open the repo's **Actions** tab. Two jobs run, one for `backend` and one for `frontend`.
   Wait for the green ticks. The multi-platform build takes a few minutes.
4. Make **both** images public so minikube can download them. Profile, **Packages**,
   `notes-backend`, **Package settings**, **Change visibility**, **Public**. Repeat for `notes-frontend`.

## Step 3: run on minikube

If your GitHub username is not `sumit-sahni`, change it in the two `image:` lines of `k8s.yaml`.

```bash
minikube start
kubectl apply -f k8s.yaml
kubectl get pods
minikube service frontend
```

Wait until all 3 pods show `1/1 Running`. The last command opens the page. Keep that terminal open.

## Step 4: the everyday loop

1. Change some code, for example a heading in `frontend/src/app/page.tsx`.
2. `git add . && git commit -m "change heading" && git push`
3. Wait for the green tick in the Actions tab.
4. Tell Kubernetes to pull the new image:
   ```bash
   kubectl rollout restart deployment/frontend
   kubectl rollout status deployment/frontend
   ```
5. Hard refresh the browser (`Cmd+Shift+R`).

Changed the backend? Use `deployment/backend` instead. Only the one you changed is replaced.

**Roll back to an older version.** Every image is also tagged with its commit (the first 7 letters
of the commit ID, visible in the Actions tab):
```bash
kubectl set image deployment/frontend app=ghcr.io/<your-username>/notes-frontend:<commit>
```

## Step 5: things to try

**Watch your click reach the backend.**
```bash
kubectl logs deployment/backend -f
```
Add and delete notes in the browser. Each click prints a line.

**Break the backend.**
```bash
kubectl scale deployment backend --replicas=0
```
The page shows **Backend unavailable** within seconds. Bring it back with `--replicas=1`.

**Self-healing.**
```bash
kubectl delete pod -l app=backend
kubectl get pods -w
```
Kubernetes starts a new pod by itself. The notes are gone, because they live in memory.

**Scale the frontend.**
```bash
kubectl scale deployment frontend --replicas=4
```

## Test local images in minikube before pushing (optional)

```bash
docker build -t notes-backend:v1 backend
docker build -t notes-frontend:v1 frontend
minikube image load notes-backend:v1
minikube image load notes-frontend:v1
```

Then in `k8s.yaml` change the two `image:` lines to `notes-backend:v1` and `notes-frontend:v1`,
and the two `imagePullPolicy: Always` lines to `imagePullPolicy: IfNotPresent`. Change them back
before you push, so the repo version pulls from GitHub.

## Clean up

```bash
kubectl delete -f k8s.yaml
```

## Common problems

| Problem | Fix |
|---|---|
| `ErrImagePull` / `ImagePullBackOff` | The pipeline has not finished, or the packages are not public yet (Step 2.4), or the username in `k8s.yaml` is wrong |
| `no match for platform in manifest` | Re-run the pipeline. It builds for both Intel and Apple Silicon |
| Pushed a change but the page is the same | Run `kubectl rollout restart deployment/frontend` after the green tick |
| Port 3000 already in use | Use `"3001:3000"` in `docker-compose.yml`, or stop the other container |
| The pipeline fails | Open the run, click the red step, and read the last lines of its log |

## How to explain it in an interview

"I built a Next.js 16 frontend and a separate Node.js backend, each in its own container. A GitHub
Actions pipeline builds both images in parallel for Intel and ARM and publishes them to GHCR,
tagged with the commit. Minikube pulls them, and the frontend is the only service exposed outside
the cluster. It forwards API calls to the backend over the cluster network using the Service name
as the address. I can update, scale or roll back either one without touching the other."

## Honest limits

- Notes are kept in memory, so they are lost when the backend restarts, and the backend runs as 1
  copy for that reason. A real app would add a database.
- The deploy step is manual (`kubectl rollout restart`). A tool like Argo CD could do it for you.
- The pipeline builds and publishes. It does not run tests or a security scan, to keep it short.
