#!/usr/bin/env node

import servicho from './src/servicho.mjs';
import chalk from 'chalk';


console.log(chalk.green('Checking for Content...'));
console.log(chalk.blue('Starting server...'));

servicho();