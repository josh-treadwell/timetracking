define('_ujgTimeUtil', [ 'jquery' ], function($) {
  var Util = {

    monthNames : [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],

    addDays : function(date, days) {
      return new Date(date.getTime() + (days * 24 * 60 * 60 * 1000));
    },

    concatenateArrQuoted : function(arrToConcatenate) {
      var result = '';
      for (var i = 0; i < arrToConcatenate.length; i++) {
        result += '"' + arrToConcatenate[i].replace(/"/g, '\\"') + '"'
            + (i < (arrToConcatenate.length - 1) ? ',' : '');
      }
      return result;
    },

    formatDurationInHrs : function(seconds) {
      var results = "", HOUR = 3600;
      results = results + ((seconds / HOUR).toFixed(2));
      return results;
    },

    formatShortDate : function(dateToFormat) {
      return this.padStr(dateToFormat.getDate()) + "<br/>" + this.monthNames[dateToFormat.getMonth()];
    },

    formatSystemDate : function(dateToFormat) {
      var dateStr = dateToFormat.getFullYear() + "-" + this.padStr(1 + dateToFormat.getMonth()) + "-"
          + this.padStr(dateToFormat.getDate());
      return dateStr;
    },

    padStr : function(i) {
      return (i < 10) ? "0" + i : "" + i;
    }

  };

  return Util;
});
