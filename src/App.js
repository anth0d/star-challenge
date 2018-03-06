import React, { Component } from 'react';
import { AwesomeButton as Button } from 'react-awesome-button';
import fetch from 'fetch-retry';
import 'react-awesome-button/dist/styles.css';
import './App.css';

const STARS_GAME_URL = 'https://wt-3ccb7711ea7b3615697f4ebb2e5e873a-0.run.webtask.io/stars';

class App extends Component {
  constructor() {
    super();
    this.state = {
      score: 0,
      correctGuesses: 0,
      incorrectGuesses: 0,
      isLoading: true,
      hasError: false,
      latestMessage: ' ',
      game: {
        id: '',
        countdown: 0,
        leftRepo: {
          name: '',
          description: ''
        },
        rightRepo: {
          name: '',
          description: ''
        }
      }
    };
    this.requestGame = this.requestGame.bind(this);
    this.selectLeftRepo = this.selectLeftRepo.bind(this);
    this.selectRightRepo = this.selectRightRepo.bind(this);
  }

  selectLeftRepo() {
    this.makeSelection(this.state.game.leftRepo.name);
  }

  selectRightRepo() {
    this.makeSelection(this.state.game.rightRepo.name);
  }

  makeSelection(name) {
    this.setState({ latestMessage: ' ' });
    const { id } = this.state.game;
    fetch(`${STARS_GAME_URL}?id=${id}&answer=${name}`, {
      retries: 10,
      retryDelay: 2000,
      retryOn: [400, 500, 503]
    })
      .then(res => res.json())
      .then(result => {
        if (!result) {
          return;
        }
        const { correctGuesses, incorrectGuesses, score } = this.state;
        const { points, correct, message } = result;
        return this.setState({
          latestMessage: message,
          score: score + points,
          correctGuesses: correctGuesses + (correct ? 1 : 0),
          incorrectGuesses: incorrectGuesses + (correct ? 0 : 1),
          isLoading: true
        });
      })
      .catch((err) => {
        console.warn(err);
      })
      .then(() => {
        setTimeout(this.requestGame, 0);
      });
  }

  requestGame() {
    fetch(`${STARS_GAME_URL}`, {
      retries: 10,
      retryDelay: 2000,
      retryOn: [400, 500, 503]
    })
    .then(res => res.json())
    .then(game => {
      const { id, timer, repos } = game;
      this.setState({
        isLoading: false,
        game: {
          id,
          countdown: timer,
          leftRepo: repos[0],
          rightRepo: repos[1]
        }
      });
    });
  }

  componentDidMount() {
    this.requestGame();
  }

  render() {
    const { isLoading, correctGuesses, incorrectGuesses, latestMessage, score, game } = this.state;
    const { leftRepo, rightRepo } = game;
    return (
      <div className="App">
        <header className="App-header">
          <div className="App-title-container">
            <br />
            <h1 className="App-title">
              <span role="img" aria-label="star challenge!">
                ✨STAR CHALLENGE✨
              </span>
            </h1>
          </div>
          <pre>
            <ul style={{paddingLeft: 0, listStyleType: 'none'}}>
              <li>right: {correctGuesses}</li>
              <li>wrong: {incorrectGuesses}</li>
              <li><strong>SCORE: {score}</strong></li>
            </ul>
            <p>{latestMessage}</p>
          </pre>
          {
            !isLoading && (
              <div>
                <Button bubbles action={this.selectLeftRepo}>
                  {leftRepo.name}
                </Button>&nbsp;&nbsp;
                <Button bubbles action={this.selectRightRepo}>
                  {rightRepo.name}
                </Button>
              </div>
            )
          }
          {
            isLoading && (
              <div>
                <Button placeholder />&nbsp;&nbsp;<Button placeholder />
              </div>
            )
          }
        </header>
        <p className="App-intro">
          Click whichever one you think has more stars on GitHub.
        </p>
        <p><em><a href="https://github.com/antkazam/star-challenge">(source)</a></em></p>
      </div>
    );
  }
}

export default App;
