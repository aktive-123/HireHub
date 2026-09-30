<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HireHub</title>
  </head>
  <body>
    @php
      $built = public_path('build/index.html');
    @endphp

    @if (file_exists($built))
      {{--
        Emitted unescaped on purpose: this is the compiled index.html, and
        escaping it would turn the whole document into visible markup so the
        browser would render a page of angle brackets with no app in it.

        The path is built from public_path() and points at a file this project
        produced at build time -- never at anything user-supplied -- so there is
        no untrusted HTML in this expression.
      --}}
      {!! file_get_contents($built) !!}
    @else
      {{--
        Reached only when the SPA has not been built yet. Serving Laravel's
        default welcome page instead would look like a working site at
        localhost:8000 while every route 404s, so this states the problem
        and the one command that fixes it.
      --}}
      <div style="font-family:system-ui,sans-serif;max-width:44rem;margin:4rem auto;padding:0 1.5rem;line-height:1.6">
        <h1 style="font-size:1.5rem">HireHub needs to be built once</h1>
        <p>
          The API is running, but the web app has not been compiled into
          <code>backend/public/build</code> yet.
        </p>
        <p>Run this once from the project root, then reload this page:</p>
        <pre style="background:#f1f3f5;padding:1rem;border-radius:.5rem"><code>npm run build</code></pre>
      </div>
    @endif
  </body>
</html>
