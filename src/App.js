import React, { Component } from 'react';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div className="App-title-container">
            <br />
            <h1 className="App-title">✨STAR CHALLENGE✨</h1>
          </div>
          <p>
            <button>TODO</button>
            <button>TODO</button>
            <span>Score: <code>1234</code></span>
          </p>
        </header>
        <p className="App-intro">
          <p>You will be shown two GitHub repositories.</p>
          <p>Click whichever one you think has more stars.</p>
        </p>
      </div>
    );
  }
}

export default App;
