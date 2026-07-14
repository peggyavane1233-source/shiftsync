import { Platform } from 'react-native';
import { DragDropCalendar as WebCalendar } from './DragDropCalendar.web';
import { DragDropCalendar as NativeCalendar } from './DragDropCalendar.native';

export const DragDropCalendar = Platform.OS === 'web' ? WebCalendar : NativeCalendar;
