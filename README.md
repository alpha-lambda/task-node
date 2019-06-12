# @alpha-lambda/tasks

This is a simple task management library, for use in Lambda, connected to SQS and maybe Kinesis.

## Usage

First, define tasks:

> tasks.js

```js
const tasks = require('@alpha-lambda/tasks');

module.exports = tasks([
    {
        type: 'foo',
        schedule(context, tasks) {
            // call SQS, Kinesis, etc.
        },
        execute(context, tasks, Task) {
            // perform the work that the task defines
            // Task is provided so you can schedule new sub-tasks if needed
        },
        validate(task) {
            // optional, verify that the task details match some schema you have
        },
        format(detail) {
            // optional, called before validate
        },
    },
]);
```

Schedule some tasks:

```js
const Task = require('./tasks');

module.exports.scheduleTasks = async (event, context) => {
    // context is passed forward schedule() in each definition
    await Task.schedule(context, [
        new Task('foo'),
        // this would throw, because 'bar' is not defined above
        new Task('bar', { foo: true }),
    ]);
};
```

Then, in some other code, such as a Lambda hooked up to SQS as an event source:

```js
module.exports.handler = async (event, context) => {
    const messages = ...
    const tasks = messages.map(message => {
        const parsed = JSON.parse(message);
        return Task.fromJSON(parsed);
    });

    await Task.execute(context, tasks);
};
```
