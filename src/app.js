

function loadComponent(componentPath) {
  import(componentPath)
    .then(module => {
      const Component = module.default;
      const root = document.getElementById('root');
      ReactDOM.render(React.createElement(Component), root);
    })
    .catch(err => console.error('Loading component failed:', err));
}

const componentPath = process.argv[2] || process.cwd();

const previewHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Component Preview</title>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    const componentPath = '${componentPath}';
    ${loadComponent.toString()}
    loadComponent(componentPath);
  </script>
</body>
</html>
`;
res.send(previewHtml);
