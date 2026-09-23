const agentCore = require('./agentCore');
const simAgent = require('./agents/simAgent');


agentCore.register('sim', simAgent);
