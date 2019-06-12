'use strict';

const sinon = require('sinon');
const test = require('ava');

const tasks = require('..');

test('returns a class', t => {
    const Task = tasks();

    t.true(typeof Task === 'function');
});

test('throws if task is undefined', t => {
    const Task = tasks();

    const err = t.throws(() => new Task('test'));

    t.is(err.message, 'Task type \'test\' not defined');
});

test('throws if task lacks type', t => {
    const err  = t.throws(() => tasks([
        {
            execute: Function.prototype,
            schedule: Function.prototype,
        },
    ]));

    t.is(err.message, 'Task must have type');
});

test('throws if task lacks execute', t => {
    const err  = t.throws(() => tasks([
        {
            type: 'foo',
        },
    ]));

    t.is(err.message, 'Task type \'foo\' missing execute()');
});

test('throws if task lacks schedule', t => {
    const err = t.throws(() => tasks([
        {
            type: 'foo',
            execute: Function.prototype,
        },
    ]));

    t.is(err.message, 'Task type \'foo\' missing schedule()');
});

test('throws if task gives improper format', t => {
    const err = t.throws(() => tasks([
        {
            type: 'foo',
            execute: Function.prototype,
            schedule: Function.prototype,
            format: 42,
        },
    ]));

    t.is(err.message, 'Task type \'foo\' format must be a function');
});

test('throws if task gives improper validate', t => {
    const err = t.throws(() => tasks([
        {
            type: 'foo',
            execute: Function.prototype,
            schedule: Function.prototype,
            validate: 42,
        },
    ]));

    t.is(err.message, 'Task type \'foo\' validate must be a function');
});

test('executes a single task', t => {
    const execute = sinon.stub();
    const schedule = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute,
            schedule,
        },
    ]);

    const task = new Task('foo');
    const context = {};

    Task.execute(context, task);

    t.is(execute.callCount, 1);
    t.is(schedule.callCount, 0);
});

test('executes multiple tasks of same type', t => {
    const execute = sinon.stub();
    const schedule = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute,
            schedule,
        },
    ]);

    const task1 = new Task('foo');
    const task2 = new Task('foo');
    const context = {};

    Task.execute(context, [task1, task2]);

    t.is(execute.callCount, 1);
    t.is(schedule.callCount, 0);
});

test('executes multiple tasks of different types', t => {
    const execute = sinon.stub();
    const schedule = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute,
            schedule,
        },
        {
            type: 'bar',
            execute,
            schedule,
        },
    ]);

    const task1 = new Task('foo');
    const task2 = new Task('bar');
    const context = {};

    Task.execute(context, [task1, task2]);

    t.is(execute.callCount, 2);
    t.is(schedule.callCount, 0);
});

test('schedules a single task', t => {
    const execute = sinon.stub();
    const schedule = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute,
            schedule,
        },
    ]);

    const task = new Task('foo');
    const context = {};

    Task.schedule(context, task);

    t.is(execute.callCount, 0);
    t.is(schedule.callCount, 1);
});

test('schedules multiple tasks of same type', t => {
    const execute = sinon.stub();
    const schedule = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute,
            schedule,
        },
    ]);

    const task1 = new Task('foo');
    const task2 = new Task('foo');
    const context = {};

    Task.schedule(context, [task1, task2]);

    t.is(execute.callCount, 0);
    t.is(schedule.callCount, 1);
});

test('schedules multiple tasks of different types', t => {
    const execute = sinon.stub();
    const schedule = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute,
            schedule,
        },
        {
            type: 'bar',
            execute,
            schedule,
        }
    ]);

    const task1 = new Task('foo');
    const task2 = new Task('bar');
    const context = {};

    Task.schedule(context, [task1, task2]);

    t.is(execute.callCount, 0);
    t.is(schedule.callCount, 2);
});

test('calls validate if specified', t => {
    const validate = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute: Function.prototype,
            schedule: Function.prototype,
            validate,
        },
    ]);

    const detail = {};
    const task = new Task('foo', detail);

    t.is(validate.callCount, 1);
    t.deepEqual(validate.firstCall.args, [task]);
});

test('throws if validate throws', t => {
    const validate = sinon.stub().throws(new Error('Invalid data!'));

    const Task = tasks([
        {
            type: 'foo',
            execute: Function.prototype,
            schedule: Function.prototype,
            validate,
        },
    ]);

    const error = t.throws(() => new Task('foo'));

    t.is(validate.callCount, 1);
    t.is(error.message, 'Invalid data!');
});

test('calls format if specified', t => {
    const format = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute: Function.prototype,
            schedule: Function.prototype,
            format,
        },
    ]);

    const detail = {};
    new Task('foo', detail);

    t.is(format.callCount, 1);
    t.deepEqual(format.firstCall.args, [detail]);
});

test('exposes toJSON method', t => {
    const Task = tasks([
        {
            type: 'foo',
            execute: Function.prototype,
            schedule: Function.prototype,
        },
    ]);

    const detail = {};
    const task = new Task('foo', detail);

    t.deepEqual(task.toJSON(), { type: 'foo', detail });
});

test('rejects if execute rejects', async t => {
    class TestError extends Error {}

    const execute = sinon.stub().rejects(TestError);

    const Task = tasks([
        {
            type: 'foo',
            execute,
            schedule: Function.prototype,
        },
    ]);

    const detail = {};
    const task = new Task('foo', detail);

    try {
        await Task.execute({}, task);
        t.fail('should not reach here');
    } catch (err) {
        t.is(err, TestError);
    }
});

test('rejects if schedule rejects', async t => {
    class TestError extends Error {}

    const schedule = sinon.stub().rejects(TestError);

    const Task = tasks([{
        type: 'foo',
        execute: Function.prototype,
        schedule,
    }]);

    const detail = {};
    const task = new Task('foo', detail);

    try {
        await Task.schedule({}, task);
        t.fail('should not reach here');
    } catch (err) {
        t.is(err, TestError);
    }
});

test('fromJSON does not call format (already formatted', t => {
    const format = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute: Function.prototype,
            schedule: Function.prototype,
            format,
        },
    ]);

    const detail = {};
    Task.fromJSON({ type: 'foo', detail });

    t.is(format.callCount, 0);
});

test('fromJSON calls validate', t => {
    const validate = sinon.stub();

    const Task = tasks([
        {
            type: 'foo',
            execute: Function.prototype,
            schedule: Function.prototype,
            validate,
        },
    ]);

    const detail = {};
    const task = Task.fromJSON({ type: 'foo', detail });

    t.is(validate.callCount, 1);
    t.deepEqual(validate.firstCall.args, [task]);
});