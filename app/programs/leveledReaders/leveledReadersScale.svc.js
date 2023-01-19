angular.module('Realize.leveledReaders.leveledReadersScale', [
    'Realize.slider.scale'
])
    .factory('LeveledReadersScale', [
        'Scale',
        function(Scale) {
            'use strict';

            var SCALE_TYPES = {
                LEXILE: 'Lexile',
                GUIDED: 'Guided Reading',
                DRA: 'DRA',
                RMM: 'Maturity'
            },
                LEXILE_CONSTANTS = {
                BR: 'BR',
                START_VALUE: 0,
                MAX_VALUE: 50,
                DIFF: 200
            },
                TYPE_LIST = _.values(SCALE_TYPES),
                //used to define which tic mark labels to render
                LEXILE_TIC_INDEXES = [0, 6, 18, 30, 43],
                GUIDED_TIC_INDEXES = [0, 8, 17, 25],
                DRA_TIC_INDEXES = [0, 2, 4, 6, 8, 10, 12, 14, 16],
                MATURITY_TIC_INDEXES = [0, 5, 11, 16],
                levelReaderSupportsRange = [SCALE_TYPES.DRA, SCALE_TYPES.LEXILE];

            function LeveledReadersScale(type) {
                if (!_.contains(TYPE_LIST, type)) {
                    throw 'Invalid Leveled Reader Scale' + type;
                }

                Scale.call(this);

                this.type = type;
                this.title = '';
                this.description = '';
            }

            LeveledReadersScale.prototype.$setTitle = function(title) {
                var self = this;
                this.title = title;

                return self;
            };

            LeveledReadersScale.prototype.$setDescription = function(description) {
                var self = this;
                this.description = description;

                return self;
            };

            LeveledReadersScale.prototype.isLevelReaderShowsRange = function() {
                return levelReaderSupportsRange.indexOf(this.type) !== -1;
            };

            LeveledReadersScale.prototype.isDraScale = function() {
                return this.type === SCALE_TYPES.DRA;
            };

            LeveledReadersScale.shouldOffcenter = function(scale) {
                var startOffcenter = false,
                    endOffcenter = false;
                if (scale && scale.type === SCALE_TYPES.LEXILE) {
                    var start = scale.selected.start === LEXILE_CONSTANTS.BR ? 0 :  scale.selected.start,
                        end =  scale.selected.end === LEXILE_CONSTANTS.BR ? 0 :  scale.selected.end,
                        delta = end - start;
                    startOffcenter =  start > LEXILE_CONSTANTS.START_VALUE &&  delta !== LEXILE_CONSTANTS.START_VALUE &&
                        delta <= LEXILE_CONSTANTS.MAX_VALUE;
                    endOffcenter = delta !== LEXILE_CONSTANTS.START_VALUE &&
                        (delta <= LEXILE_CONSTANTS.MAX_VALUE ||
                        (start === LEXILE_CONSTANTS.START_VALUE && delta <= LEXILE_CONSTANTS.DIFF));
                }
                return {startOffcenter: startOffcenter, endOffcenter: endOffcenter};
            };

            angular.extend(LeveledReadersScale.prototype, Scale.prototype);

            LeveledReadersScale.TYPES = SCALE_TYPES;
            LeveledReadersScale.TYPE_LIST = TYPE_LIST;
            LeveledReadersScale.TIC_INDEXES_BY_TYPE = _.object(TYPE_LIST, [
                LEXILE_TIC_INDEXES,
                GUIDED_TIC_INDEXES,
                DRA_TIC_INDEXES,
                MATURITY_TIC_INDEXES]);

            return LeveledReadersScale;

        }]);
