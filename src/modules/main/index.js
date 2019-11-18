import React, { useContext,useState,useEffect,useRef } from 'react';
import { Spin, message } from 'antd';
import './index.css';
import { Title,Marquee,MultText } from '../../components/text';
import Img from '../../components/image';
import { LayoutContext } from '../../store';

let timer = null;

const MapView = {
	'Title':Title,
	'Marquee':Marquee,
	'MultText':MultText,
	'Image':Img
}



const useMove = (ref) => {
	const [ move,setMove ] = useState(false);
	const [ pos,setPos ] = useState([0,0]);
	useEffect(()=>{
		const desk = ref.current;
		let drag = false;
		let start = [0,0];
		let posStart = [0,0];
		let moverun = false;
		const moveruning = (ev)=>{
			if(moverun){
				setPos([posStart[0]+(ev.clientX-start[0])/1,posStart[1]+(ev.clientY-start[1])/1]);
			}
		}
		
		const moverunend = () => {
			moverun = false;
		}

		const moverunstart = (ev) => {
			if(drag){
				moverun = true;
				start = [ev.clientX,ev.clientY];
				setPos(v=>{
					posStart = v;
					return v
				})
			}
		}
		
		const movestart = (ev) => {
			if(ev.altKey){
				ev.preventDefault();
			}
			if(ev.keyCode===32){
				setMove(true);
				drag = true;
				ev.target.focus();
				
			}
		}

		const moveend = (ev) => {
			setMove(false);
			drag = false;
		}

		const wheelmove = (ev) => {
			if(!ev.altKey){
				const dir = ev.deltaY > 0 ? -50:50;
				if(ev.shiftKey){
					setPos(v=>[v[0]+dir,v[1]]);
				}else{
					setPos(v=>[v[0],v[1]+dir]);
				}
			}
		}
		desk.addEventListener('keydown',movestart);
		desk.addEventListener('keyup',moveend);
		desk.addEventListener('mousedown',moverunstart);
		desk.parentNode.addEventListener('wheel',wheelmove);
		document.addEventListener('mousemove',moveruning);
		document.addEventListener('mouseup',moverunend);
		return ()=>{
			desk.removeEventListener('keydown',movestart);
			desk.removeEventListener('keyup',moveend);
			desk.removeEventListener('mousedown',moverunstart);
			desk.parentNode.removeEventListener('wheel',wheelmove);
			document.removeEventListener('mousemove',moveruning)
			document.removeEventListener('mouseup',moverunend)
		}
	},[ref])
	return {move,pos}
}

const Main = () => {

	let dragData = null;

	const { layout, dispatch, config, setConfig, focusIndex, setFocusIndex } = useContext(LayoutContext);

	const [loading,setLoading] = useState(false);

	const dragstart = (target,i) => {
		dragData = target;
		dragData.index = i;
	}

	const desk = useRef(null);

	const {move,pos} = useMove(desk);

	const dragover = (ev) => {
		ev.preventDefault();
	}

	const drop = (ev) => {
		ev.preventDefault();
		if(loading){
			message.warning('正在处理，请稍后...');
		}
		const type = ev.dataTransfer.getData('type');
		if(type){
			const target = ev.target.closest('.desk-top');
			const { left, top } = target.getBoundingClientRect();
			const offsetX = ev.dataTransfer.getData('offsetX');
			const offsetY = ev.dataTransfer.getData('offsetY');
			dispatch({
				type:'ADD',
				props: MapView[type].defaultProps,
				position: [(ev.clientX-left-offsetX)/config.zoom,(ev.clientY-top-offsetY)/config.zoom],
				components: type
			})
			setFocusIndex([layout.length]);
			//ev.dataTransfer.clearData();
		}
		if(ev.dataTransfer.files[0]){

			const [file] = ev.dataTransfer.files;
			if(!file){
				return false;
			}
			if(!file.type.includes('image')){
				message.error('所选文件不是图片类型');
				return false;
			}
			if(file.size>1024*1024*2){
				message.error('选择图片过大，不能超过2M');
				return false;
			}
			setLoading(true);
			const x = ev.clientX;
			const y = ev.clientY;
			const target = ev.target.closest('.desk-top');
			const { left, top } = target.getBoundingClientRect();
			const reader = new FileReader();
		    reader.readAsDataURL(file);
		    reader.addEventListener('load', () => {
		    	const image = new Image()
	         	image.src = reader.result;
	         	image.onload = () => {
					dispatch({
						type:'ADD',
						props: MapView['Image'].defaultProps,
						position: [(x-left-image.width/2)/config.zoom,(y-top-image.height/2)/config.zoom],
						components: 'Image',
						other:{
							style:{
								width: image.width,
								height: image.height
							},
							data:{
								src: reader.result,
								tempSrc: URL.createObjectURL(file)
							}
						}
					})
			    	setLoading(false);
	         	}
		    });
		}
		if(dragData){
			dispatch({
				type:'UPDATA',
				source:{
					style:{
						left: dragData.left,
						top: dragData.top,
					}
				},
				index:dragData.index
			})
		}
	}

	const dragend = (ev) => {
		dragData = null;
	}

	const keymove = (data,i) => {
		const [_x,_y] = data;
		timer && clearTimeout(timer);
        timer = setTimeout(()=>{
            dispatch({
				type:'UPDATA',
				source:{
					style:{
						left: _x,
						top: _y,
					}
				},
				index:i
			})
        },100);
	}

	const resize = (data) => {
		
	}

	const resizeend = (data,i,left,top) => {
        dispatch({
			type:'UPDATA',
			source:{
				style:{
					left: left + data.offsetX,
					top: top + data.offsetY,
					width: data.width,
					height: data.height,
				}
			},
			index:i
		})
	}

	const zoom = (ev) => {
		if(ev.altKey){
			const dir = ev.deltaY > 0 ? -0.1:0.1;
			setConfig({
				...config,
				zoom: Math.min(Math.max(config.zoom + dir,.5),2) 
			})
		}
	}

	

	const select = (ev,i) => {
		ev.stopPropagation();
		if(!move){
			if(!focusIndex.includes(i) && focusIndex[0]!==i){
				setFocusIndex([i]);
			}
		}
	}

	const onChange = (data,index) => {
		dispatch({
			type:'UPDATA',
			source: data,
			index:index
		})
	}

	const gradientColor = Array.isArray(config.backgroundColor)?`,linear-gradient(${config.backgroundColor[0]}deg, ${config.backgroundColor[1]}, ${config.backgroundColor[2]})`:'';

	return (
		<div className="desk-top" 
			data-move={move}
			data-grid={config.gridvisible&&config.grid>=5}
			onWheel={zoom}
			id="desk-top"
			ref={desk}
			onClick={(ev)=>select(ev,-1)} 
			data-select={focusIndex.includes(-1)} 
			tabIndex={-2}
			style={{
				width:config.width,
				height:config.height,
				backgroundColor:config.backgroundColor,
				backgroundImage:`url(${config.backgroundTempURL||config.backgroundImage})${gradientColor}`,
				'--grid':config.grid,
				'--zoom':config.zoom,
				'--x':pos[0],
				'--y':pos[1],
			}} 
			onDragOver={dragover} 
			onDrop={drop}
		>
			{
				layout.map((el,i)=>{
					const { left, top} = el.style;
					const View = MapView[el.type];
					return (
						<View 
							key={i} 
							draggable={true} 
							resizeable={true}
							grid={config.grid}
							zoom={config.zoom}
							style={el.style}
							props={el.props}
							data={el.data}
							select={focusIndex.includes(i)}
							onChange={(data)=>onChange(data,i)}
							onClick={(ev)=>select(ev,i)}
							onDragStart={(dragData)=>dragstart(dragData,i)} 
							onDragEnd={dragend}
							onKeyMove={(data)=>keymove(data,i)}
							onResize={resize}  
							onResizeEnd={(resizeData)=>resizeend(resizeData,i,left,top)} />
					)
				})
			}
			<Spin spinning={loading} className="desk-loading"/>
		</div>
	)
}

export default Main;