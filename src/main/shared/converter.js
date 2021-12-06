/* eslint-disable */

function calc_ctrl_point_pos(orig_x, orig_y, theta, radius) {
    // calculate the absolute position of a control point
    // specified by theta and radius from an origin point
    var res_x = orig_x + Math.cos(theta) * radius;
    var res_y = orig_y + Math.sin(theta) * radius;
    return [res_x, res_y];
}


function head_motion_convert(kfs) {
    var head_motion = new Array();  // array of transitions for motion file output
    var prev_kf = null;  // keep the previous keyframe
    var prev_kf_num = null;  // keep the previous keyframe number (position on the timeline grid)

    for (var this_kf_num in kfs) {
        var this_kf = kfs[this_kf_num];  // this keyframe data
        var this_transition = new Object();  // this transition for motion file output

        if (prev_kf_num == null) {  // this keyframe is the first keyframe
            // the first transition duration is the timeline grid count from 0 by milliseconds per grid division
            this_transition["duration"] = parseInt(this_kf_num);
        }
        else {  // there is a previous transition
            // other transition duration is the timeline grid count from the previous keyframe
            // by milliseconds per grid division
            this_transition["duration"] = (parseInt(this_kf_num)-parseInt(prev_kf_num));
        }

        if (this_kf["keep"] == true) {
            // when keeping, all points are null
            this_transition["p0"] = [null, null];
            this_transition["p1"] = [null, null];
            this_transition["p2"] = [null, null];
            this_transition["p3"] = [null, null];
            // 'ease' is ignored so set to all 0
            this_transition["ease"] = [0.0, 0.0, 0.0, 0.0];
        }
        else {
            this_transition["p0"] = [null, null];  // cannot specify start point so always all null
            if (prev_kf == null) {  // this keyframe is the first non-keep keyframe
                this_transition["p1"] = [null, null];
            }
            else {
                // first control point of a curve is kept with the previous keyframe data
                this_transition["p1"] = calc_ctrl_point_pos(prev_kf["x"], prev_kf["y"], prev_kf["controlPoints"][1]["theta"], prev_kf["controlPoints"][1]["radius"]);
            }
            this_transition["p2"] = calc_ctrl_point_pos(this_kf["x"], this_kf["y"], this_kf["controlPoints"][0]["theta"], this_kf["controlPoints"][0]["radius"]);
            this_transition["p3"] = [this_kf["x"], this_kf["y"]];
            // easing graph axes origin in the GUI is at top-left corner, adjusting y axis for this
            this_transition["ease"] = [this_kf["bezierPoints"][2]["x"], 1.0-this_kf["bezierPoints"][2]["y"], this_kf["bezierPoints"][3]["x"], 1.0-this_kf["bezierPoints"][3]["y"]];

            prev_kf = this_kf;
        }

        prev_kf_num = this_kf_num;

        head_motion.push(this_transition);
    }

    return head_motion;
}


function antenna_motion_convert(kfs) {
    var ant_motion = new Array();  // array of transitions for motion file output
    var prev_kf_num = null;  // keep the previous keyframe number

    for (var this_kf_num in kfs) {
        var this_kf = kfs[this_kf_num];  // this keyframe data
        var this_transition = new Object();  // this transition for motion file output

        if (prev_kf_num == null) {  // this keyframe is the first keyframe
            // grid divisions count from 0 * milliseconds per division
            this_transition["duration"] = parseInt(this_kf_num);
        }
        else {  // there is a previous transition
            // grid divisions count from previous keyframe * millisedonds per division
            this_transition["duration"] = (parseInt(this_kf_num)-parseInt(prev_kf_num));
        }

        // both 'start' and 'end' are objects
        this_transition["start"] = new Object();
        this_transition["end"] = new Object();

        if (this_kf["startPoint"] == null) {
            this_transition["start"]["amp"] = null;
            this_transition["start"]["freq"] = null;
            this_transition["start"]["pos"] = null;
        }
        else {
            if (this_kf["usePosition"] == true) {
                // in case of specifying position
                this_transition["start"]["amp"] = null;
                this_transition["start"]["freq"] = null;
                this_transition["start"]["pos"] = this_kf["startPoint"]["position"];
            }
            else {
                // in case of specifying amplitude and frequency
                this_transition["start"]["amp"] = this_kf["startPoint"]["amplitude"];
                this_transition["start"]["freq"] = this_kf["startPoint"]["frequency"];
                this_transition["start"]["pos"] = null;
            }
        }

        if (this_kf["usePosition"] == true) {
            // in case of specifying position
            this_transition["end"]["amp"] = null;
            this_transition["end"]["freq"] = null;
            this_transition["end"]["pos"] = this_kf["position"];
        }
        else {
            // in case of specifying amplitude and frequency
            this_transition["end"]["amp"] = this_kf["amplitude"];
            this_transition["end"]["freq"] = this_kf["frequency"];
            this_transition["end"]["pos"] = null;
        }

        prev_kf_num = this_kf_num;

        ant_motion.push(this_transition);
    }

    return ant_motion;
}


function led_motion_convert(kfs) {
    var led_motion = new Array();  // array of transitions for motion file output
    var prev_kf_num = null;  // keep the previous keyframe number

    for (var this_kf_num in kfs) {
        var this_kf = kfs[this_kf_num];  // this keyframe data
        var this_transition = new Object();  // this transition for motion file output

        if (prev_kf_num == null) {  // this keyframe is the first keyframe
            // grid division count from start * milliseconds per division
            this_transition["duration"] = parseInt(this_kf_num);
        }
        else {  // there is a previous transition
            // grid division count from previous keyframe * milliseconds per division
            this_transition["duration"] = (parseInt(this_kf_num)-parseInt(prev_kf_num));
        }

        if (this_kf["startPoint"] == null) {
            this_transition["start"] = [null, null, null, null];
        }
        else {
            this_transition["start"] = [this_kf["startPoint"]["r"], this_kf["startPoint"]["g"], this_kf["startPoint"]["b"], this_kf["startPoint"]["a"]];
        }

        if (this_kf["keep"] == true) {
            // in case of keeping, all null
            this_transition["end"] = [null, null, null, null];
            // easing is ignored so set to all 0
            this_transition["ease"] = [0.0, 0.0, 0.0, 0.0];
        }
        else {
            this_transition["end"] = [this_kf["r"], this_kf["g"], this_kf["b"], this_kf["a"]];
            // easing graph in GUI has origin in top-left and y axis pointing down, adjusting y values for that
            this_transition["ease"] = [this_kf["bezierPoints"][2]["x"], 1.0-this_kf["bezierPoints"][2]["y"], this_kf["bezierPoints"][3]["x"], 1.0-this_kf["bezierPoints"][3]["y"]];
        }

        prev_kf_num = this_kf_num;

        led_motion.push(this_transition);
    }

    return led_motion;
}

/* eslint-enable */

import libpath from 'path';

export default ({ keyframesList, sound: { delay, name } }) => {
    const data = {};

    var delay_ms = delay * 1000;
    data['sound'] = { delay_ms, name: libpath.basename(name) };

    // head motion transitions
    data['head'] = head_motion_convert(keyframesList[0]['keyframes']);

    // antenna motion transitions
    data['antenna'] = antenna_motion_convert(keyframesList[1]['keyframes']);

    // led motion transitions
    data['led_cheek_l'] = led_motion_convert(keyframesList[2]['keyframes']);
    data['led_cheek_r'] = led_motion_convert(keyframesList[3]['keyframes']);
    data['led_rec'] = led_motion_convert(keyframesList[4]['keyframes']);
    data['led_play'] = led_motion_convert(keyframesList[5]['keyframes']);
    data['led_func'] = led_motion_convert(keyframesList[6]['keyframes']);

    return data;
};
