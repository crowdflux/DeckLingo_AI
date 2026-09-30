# Non-root container runtime

The final runtime image uses user/group `app`, UID/GID `10001:10001`,
home `/home/app`, and application directory `/app` owned by that identity.
Application COPY instructions set numeric ownership. Dependency installation
and permission setup finish before the final `USER 10001:10001`.

Replace the incomplete nodejs identity with app:app at 10001:10001 and run npm from /app.

Writable uploads: /app/uploads; home/cache: /home/app. Port 3000 and the health check are preserved.

Bind mounts replace image permissions: mounted application inputs must be
readable and output/cache directories writable by 10001:10001. Image ownership
does not change existing volume ownership. Vault and deployment configuration
are left to DevOps.

Validation performed: git diff whitespace checks, Dockerfile RUN shell syntax,
exec-form command JSON, final runtime identity/setup-order checks, and shell
syntax checks for changed startup scripts where present. All passed.
No Docker images were built or run for this change. Runtime UID/GID, startup,
health checks, dependency resolution and application integration tests remain
unverified; validate them in CI and a suitable staging environment before merging.
