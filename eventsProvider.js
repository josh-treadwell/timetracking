define(
    '_ujgTimeEventsProvider',
    [ 'jquery', '_ujgUtil', '_ujgTimeUtil' ],
    function($, util, timeUtil) {
      var EventsProvider = function(API) {
        return {
          eventsArr : undefined,
          maxResults : 1000, // Could be redefined by JIRA JSON responce
          startAt : undefined,
          total : undefined,

          getEvents : function(dataParams, callbackEventsFun) {
            console.log("getEvents, dataParams = " + dataParams);
            var paramsValidationErrors = "";
            if (dataParams === undefined || typeof dataParams !== 'object') {
              paramsValidationErrors += "You need to pass dataParams object.";
            } else {
              var datesOk = true;
              if (dataParams.start === undefined || !(dataParams.start instanceof Date)) {
                paramsValidationErrors += "\"dataParams.start\" should be valid date. ";
                datesOk = false;
              }
              if (dataParams.end === undefined || !(dataParams.end instanceof Date)) {
                paramsValidationErrors += "\"dataParams.end\" should be valid date. ";
                datesOk = false;
              }
              if (datesOk && dataParams.start >= dataParams.end) {
                paramsValidationErrors += "\"dataParams.start\" should be prior to \"dataParams.end\".";
              }
              if (!dataParams.allUsers
                  && (dataParams.userIds === undefined || !(dataParams.userIds instanceof Array))) {
                paramsValidationErrors += "You need to pass \"dataParams.userIds\". These are account ids under Jira Cloud and usernames under Jira Server. To get all users, omit dataParams.userIds and set true for \"dataParams.allUsers\".";
              }
            }
            if (paramsValidationErrors !== "") {
              util.showMessage(API.getGadgetContentEl().find(".ujg-timesheet"), "error", "Invalid parameters",
                "EventsProvider.getEvent input parameters errors: " + paramsValidationErrors);
              API.resize();
              return;
            }
            if (dataParams.jql === undefined) {
              dataParams.jql = "";
            }
            var that = this;
            // need to "clear" state of the EventsProvider object
            this.eventsArr = [];
            this.startAt = 0;
            this.total = 0;
            this._retrieveJSON(dataParams, function() {
              callbackEventsFun(that.eventsArr);
            });
          },

          _isStrVarSet : function(varToCheck) {
            return varToCheck !== undefined && varToCheck.length > 0;
          },

          _parseDate : function(val) {
            var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}\.\d*(\+|\-)(\d{2})(\d{2})$/.exec(val);
            var minutesOffset = m[7] * 60 + m[8] * 1;
            if (m[6] === '+') {
              minutesOffset = 0 - minutesOffset;
            }
            return new Date(Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5] - 0 + minutesOffset));
          },

          // parses the json response and stores results in evntsObj
          _parseJiraJSON : function(dataParams, json, parseCallback) {
            // console.log(json);
            this.maxResults = json.maxResults;
            this.startAt = json.startAt;
            this.total = json.total;

            if (json.issues.length == 0) {
              // no issues returned
              parseCallback();
              return;
            }

            var i = 0;
            var loopArray = function(json) {
              handleWorklog(json.issues[i], function() {
                i++;
                // any more items in array? continue loop
                if (i < json.issues.length) {
                  loopArray(json);
                } else {
                  parseCallback();
                }
              });
            }
            var that = this;
            var handleWorklog = function(issue, loopCallback) {
              console.log(issue.key);
              if (issue.fields.worklog !== undefined) {
                if (issue.fields.worklog.maxResults < issue.fields.worklog.total) {
                  // separate request to fetch all worklogs for issue, luckily it returns all worklogs so no need
                  // for recursion
                  var url = "/rest/api/2/issue/" + issue.key + "/worklog";
                  util.makeAjaxCall({
                    API: API,
                    url : url,
                    contentType : "application/json",
                    dataType: 'json',
                    success : function(jsonWorklogs) {
                      // console.log("=== that._parseWorklogs in success");
                      that._parseWorklogs(dataParams, issue, jsonWorklogs.worklogs);
                      loopCallback();
                    }
                  });
                } else {
                  // console.log("=== that._parseWorklogs in else");
                  that._parseWorklogs(dataParams, issue, issue.fields.worklog.worklogs);
                  loopCallback();
                }
              } else {
                // Carl Zeng reported that for some issues worklog is undefined. We skip such
                // issues.
                loopCallback();
              }
            }
            // start 'loop'
            loopArray(json);
          },

          // parses the worklogs json response and stores results in eventsArr
          _parseWorklogs : function(dataParams, issue, worklogsArr) {
            for (var j = 0; j < worklogsArr.length; j++) {
              var worklog = worklogsArr[j], startedDate = this._parseDate(worklog.started);
              // filter out by userIds and date
              if ((dataParams.allUsers || dataParams.userIds.indexOf(util.isOnDemand() ? worklog.author.accountId : worklog.author.name) > -1)
                  && startedDate >= dataParams.start && startedDate < dataParams.end) {
                worklog.startedDate = startedDate;
                worklog.issueKey = issue.key;
                this.eventsArr.push(worklog);
              }
            }
          },

          _retrieveJSON : function(dataParams, callbackFun, startAt) {
            var jqlStr = "worklogDate >= "
              + timeUtil.formatSystemDate(dataParams.start)
              + " AND worklogDate < "
              + timeUtil.formatSystemDate(dataParams.end)
              + (!dataParams.allUsers ? " AND worklogAuthor in (" + timeUtil.concatenateArrQuoted(dataParams.userIds)
              + ")" : "")
              + (dataParams.jql !== "" ? " AND " + dataParams.jql : "")
              + " AND timespent > 0&fields=summary,worklog&maxResults=" + this.maxResults
              + (startAt != null ? "&startAt=" + startAt : "");
            console.log("_retrieveJSON, jqlStr = " + jqlStr);
            var url = "/rest/api/2/search?jql=" + jqlStr;
            var that = this;
              util.makeAjaxCall({
                  API: API,
                  url : encodeURI(url),
                  contentType : "application/json",
                  dataType: 'json',
                  success : function(data) {
                    that._parseJiraJSON(dataParams, data, function() {
                      console.log("that.total that.startAt that.maxResults " + that.total + " " + that.startAt + " "
                          + that.maxResults);
                      if (that.total - that.startAt > that.maxResults) {
                        console.log("recursion");
                        that._retrieveJSON(dataParams, callbackFun, that.startAt + that.maxResults);
                      } else {
                        console.log("callbackFun");
                        callbackFun();
                      }
                    });
                  },
                  error : function(jqXHR, textStatus, errorThrown) {
                    if (jqXHR != null && jqXHR.responseText != null) {
                      if (jqXHR.responseText.indexOf("by anonymous") > -1) {
                        util.showMessage(API.getGadgetContentEl().find(".ujg-timesheet"), "error", "No access", "Looks like your JIRA session ended.<br/>Please log in.");
                        API.resize();
                      } else if (jqXHR.responseText.indexOf("'project'") > -1) {
                        /**
                         * Probably it's "The value 'PROJ_KEY' does not exist for the field 'project'." error caused by
                         * luck of BROWSE permission. Try to handle it nicely.
                         */
                        util.showMessage(API.getGadgetContentEl().find(".ujg-timesheet"), "error", "No permissions", "Failed to retrieve issues.<br/>"
                                + "Looks like you do not have BROWSE permission for at least one project. "
                                + "This can happen when you are JIRA admin or Project admin and in the same time, you do not have "
                                + "'Browse Projects' permission for projects that you can access as admin. "
                                + "You need to grant 'Browse Project' permission to see reporting for these projects. "
                                + "<br/>You can find project keys in error returned by JIRA:<br/><br/>"
                                + jqXHR.responseText);
                        API.resize();
                      } else if (jqXHR.responseText.indexOf("'timespent'") > -1) {
                        /**
                         * Looks like Time Tracking is not enabled
                         */
                        util.showMessage(API.getGadgetContentEl().find(".ujg-timesheet"), "error", "Time Tracking is inactive", "Looks like your JIRA Time Tracking is deactivated.<br/>"
                          + "Please contact your JIRA administrator.");
                        API.resize();
                      } else {
                        util.handleError(API, url, jqXHR, textStatus, errorThrown);
                      }
                    } else {
                      util.handleError(API, url, jqXHR, textStatus, errorThrown);
                    }
                  }
                });
          }

        }
      }; // var EventsProvider =
      //var eventsProvider = new EventsProvider();
      return EventsProvider;
    });
