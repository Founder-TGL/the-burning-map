class Player {
  constructor(icon = [], squibbles = [], role = 0, playerNumber = 0, score = 0) {
    this.icon = icon;
    this.squibbles = squibbles;
    this.role = role;
    this.playerNumber = playerNumber;
    this.score = score;
    this.canvas = document.createElement( 'player-' + playerNumber + "-canvas" );
  }

  drawIcon() {
    
  }


}