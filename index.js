//'use strict';
const { execFile } = require( 'child_process' );
const { readFileSync, existsSync } = require( 'fs' )
exports.main_handler = async ( event, context, callback ) => {
    var eventObj;
    eventObj = JSON.parse( event ).payload
    console.log( `开始执行: 参数为:${ eventObj }` )
    let scripts = [];
    const msg = eventObj.Message;
    const async = eventObj.async;
    scripts = loadScripts( msg );
    const tasks = [];
    const count = 5;
    console.log( `run script:${ eventObj }` )
    for ( let i = 0; i < scripts.length; i++ ) {
        const script = scripts[i];
        if ( i > count ) {
            await tasks[i - count];
            delete tasks[i - count];
        }
        console.log( `run script:${ script }` )
        const name = './' + script + '.js'
        tasks[i] = new Promise( ( resolve ) => {
            const child = execFile( process.execPath, [name] )
            child.stdout.on( 'data', function ( data ) {
                console.log( data )
            } )
            child.stderr.on( 'data', function ( data ) {
                console.error( data )
            } )
            child.on( 'close', function ( code ) {
                console.log( `${ script } finished` )
                delete child
                resolve()
            } )
        } )
    }

    await Promise.all( tasks )

    callback( null, "执行完毕" )
}

function loadScripts ( msg, includeAll ) {
    let now_hour = ( new Date().getUTCHours() + 8 ) % 24
    console.log( 'hourly config触发,当前:', now_hour )
    if ( msg ) {
        const hour = Number( msg )
        if ( !isNaN( hour ) && hour >= 0 && hour <= 23 ) {
            now_hour = hour
            console.log( 'hourly config触发,自定义触发小时:', now_hour )
        }
    }
    const config_file = __dirname + '/config.json'
    if ( existsSync( config_file ) ) {
        console.log( `${ config_file } 存在` )
    } else {
        console.error( `${ config_file } 不存在,结束` )
        process.exit()
    }
    try {
        config = JSON.parse( readFileSync( config_file ) )
    } catch ( e ) {
        console.error( `读取配置文件失败:${ e }` )
        return []
    }
    const scripts = [];
    for ( let script in config ) {
        if ( includeAll ) {
            scripts.push( script )
            continue;
        }
        // console.debug(`script:${script}`)
        const cron = config[script]
        if ( typeof cron == 'number' ) {
            // console.debug(`number param:${cron}`)
            if ( now_hour % cron == 0 ) {
                console.debug( `${ script }:数字参数触发` )
                scripts.push( script )
            }
        } else {
            // console.debug(`dict param:${cron}`)
            if ( cron.includes && cron.includes( now_hour ) ) {
                console.debug( `${ script }:列表参数触发` )
                scripts.push( script )
            }
        }
    }
    return scripts;
}