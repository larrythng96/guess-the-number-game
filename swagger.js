import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Guess the Number API',
      version: '1.0.0',
      description: 'A multiplayer guess-the-number game API',
    },
  },
  apis: ['./server.js'],
};

export default swaggerJsdoc(options);
