'use strict';

const assert = require('assert');

module.exports = (definitions = []) => {
    const map = definitions.reduce((memo, definition) => {
        const {
            type,
            execute,
            format,
            schedule,
            validate,
        } =  definition;

        assert(type, 'Task must have type');
        assert(typeof execute === 'function', `Task type '${type}' missing execute()`);
        assert(typeof schedule === 'function', `Task type '${type}' missing schedule()`);

        if (validate) {
            assert(typeof validate === 'function', `Task type '${type}' validate must be a function`);
        }

        if (format) {
            assert(typeof format === 'function', `Task type '${type}' format must be a function`);
        }

        return memo.set(type, definition);
    }, new Map());

    function configure(task, type, detail, validate) {
        Object.defineProperties(task, {
            detail: {
                value: detail,
            },
            type: {
                value: type,
            },
        });

        if (typeof validate === 'function') {
            validate(task);
        }
    }

    function getDefinition(type) {
        const definition = map.get(type);
    
        if (definition) {
            return definition;
        }

        throw new Error(`Task type '${type}' not defined`);
    }

    function groupByType(tasks) {
        const byType = [].concat(tasks).reduce((acc, task) => {
            const { type } = task;
            const group = acc[type];

            if (group === undefined) {
                const definition = getDefinition(type);

                acc[type] = {
                    definition,
                    tasks: [task],
                };
            } else {
                group.tasks.push(task);
            }

            return acc;
        }, {});

        return Object.values(byType);
    }

    return class Task {

        static fromJSON({ type, detail }) {
            const { validate } = getDefinition(type);
            const task = Object.create(Task);

            configure(task, type, detail, validate);

            return task;
        }

        static execute(context, tasks) {
            const groups = groupByType(tasks);
            return Promise.all(groups.map(({ definition, tasks: group }) => {
                return definition.execute(context, group, Task);
            }));
        }

        static schedule(context, tasks) {
            const groups = groupByType(tasks);
            return Promise.all(groups.map(({ definition, tasks: group }) => {
                return definition.schedule(context, group);
            }));
        }

        constructor(type, data) {
            const { validate, format } = getDefinition(type);
            const detail = typeof format === 'function'
                ? format(data)
                : data;

            configure(this, type, detail, validate);
        }

        toJSON() {
            const { type, detail } = this;
            return { type, detail };
        }

    }
};
