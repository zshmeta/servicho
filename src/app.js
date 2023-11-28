import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const PreviewApp = ({ componentPath }) => {
  const [Component, setComponent] = useState(null);

  useEffect(() => {
    import(componentPath)
      .then(module => setComponent(() => module.default))
      .catch(err => console.error(err));
  }, [componentPath]);

  return (
    <div>
      {Component ? <Component /> : <p>Loading component...</p>}
    </div>
  );
};

// Assuming the component path is passed via a global variable
ReactDOM.render(
  <PreviewApp componentPath={window.REACT_COMPONENT_PATH} />,
  document.getElementById('root')
);
