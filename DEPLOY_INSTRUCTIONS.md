# Deployment Instructions

1.  **Commit Changes**:
    I have modified `package.json` to fix a startup issue. You need to commit this change.
    ```bash
    git add package.json
    git commit -m "Fix: remove type: module to support CommonJS build"
    ```

2.  **Push to GitHub**:
    ```bash
    git push origin main
    ```

3.  **Deploy to Render**:
    - Go to your Render dashboard.
    - If you have already connected this repository, the push should trigger a new deployment.
    - If not, create a new "Web Service".
    - Connect your GitHub repository `foodie-dash-front` (or `test_electron` if that's where it is, but it seems to be `foodie-dash-front`).
    - Select the `server` directory as the **Root Directory** (if the repo contains both front and back).
      - *Note*: If this repo is ONLY the backend, leave Root Directory empty. But since it's in `server/`, you likely need to specify `server` as the Root Directory in Render settings.
    - Render should detect `render.yaml` and configure automatically.
    - If not, ensure:
      - **Build Command**: `npm install && npm run build`
      - **Start Command**: `npm start`
      - **Environment Variables**: Add `MONGODB_URI`, `JWT_SECRET`, etc.

4.  **Verify**:
    - Check the Render logs. It should say "Server running on port...".
