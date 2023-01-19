angular.module('Realize.Discussions.ThreadUtilsSvc', [
    'rlzComponents.components.telemetryService',
    'Realize.discuss.constants'
])
    .service('threadUtilsSvc', [
        'telemetryService',
        'baseTelemetryEvents',
        'DISCUSS_CONSTANTS',
        function(telemetryService, baseTelemetryEvents, DISCUSS_CONSTANTS) {
            'use strict';

            var buildTelemetryData = function(type, fileName, name, subPage) {
                var attachmentObjectEvent = {
                    extensions: {
                        area: DISCUSS_CONSTANTS.ANALYTICS.CLASSES,
                        page: DISCUSS_CONSTANTS.ANALYTICS.DISCUSS,
                        product: DISCUSS_CONSTANTS.EVENT_TYPE.PROGRAM_NOT_AVAILABLE,
                        description: getDescription(type),
                        value: fileName,
                    },
                    definition: {
                        name: name,
                    },
                };
                attachmentObjectEvent.extensions['sub-page'] = subPage;
                return attachmentObjectEvent;
            };

            var getDescription = function(attachmentType) {
                var description = DISCUSS_CONSTANTS.EVENT_TYPE.ATTACHMENT.concat(': ');
                description = (attachmentType === DISCUSS_CONSTANTS.ANALYTICS.ATTACH_GOOGLE_DRIVE_LINK) ?
                description.concat(DISCUSS_CONSTANTS.EVENT_TYPE.GOOGLE_DRIVE_FILE)
                : description.concat(DISCUSS_CONSTANTS.EVENT_TYPE.ONE_DRIVE_FILE);
                return description;
            };

            this.sendTelemetryDataFromDiscussionPost = function(type, fileName, name, subPage) {
                var activityDetails = baseTelemetryEvents.createEventData(DISCUSS_CONSTANTS.EVENT_TYPE.ATTACH,
                    buildTelemetryData(type, fileName, name, subPage));

                telemetryService.sendTelemetryEvent(activityDetails);
            };
        }
    ]);
