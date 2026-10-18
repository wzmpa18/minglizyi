import WidgetKit
import SwiftUI
import AppIntents

enum CalendarTheme:String,AppEnum {
    case paper,cinnabar,ink
    static var typeDisplayRepresentation:TypeDisplayRepresentation="Theme"
    static var caseDisplayRepresentations:[CalendarTheme:DisplayRepresentation]=[.paper:"Paper and ink",.cinnabar:"Cinnabar and gold",.ink:"Ink night"]
    var background:Color {switch self{case .paper:return Color(red:0.965,green:0.941,blue:0.894);case .cinnabar:return Color(red:0.98,green:0.945,blue:0.898);case .ink:return Color(red:0.067,green:0.094,blue:0.125)}}
    var foreground:Color {self == .ink ? Color(red:0.91,green:0.87,blue:0.80) : Color(red:0.18,green:0.15,blue:0.13)}
}
struct CalendarWidgetIntent:WidgetConfigurationIntent {
    static var title:LocalizedStringResource="Yandao calendar"
    static var description=IntentDescription("Calendar data follows the observation zone selected in the app. Private event details stay hidden.")
    @Parameter(title:"Theme",default:.paper) var theme:CalendarTheme
    @Parameter(title:"Large text",default:false) var largeText:Bool
}
struct SnapshotRow:Decodable {
    let from:Double,until:Double,solar:String,lunar:String,pillars:String,jieqi:String,clock:String,secondsOfDay:Int
}
struct CalendarData:Decodable {let schemaVersion:Int,ruleVersion:String,timeZone:String,placeName:String,generatedAt:Double,expiresAt:Double,entries:[SnapshotRow]}
struct ReminderData:Decodable {let id:Int,at:Double}
struct AgendaData:Decodable {let at:Double}
struct SharedCalendar:Decodable {let snapshot:CalendarData,reminders:[ReminderData],locale:String?,agenda:[AgendaData]?}
struct CalendarEntry:TimelineEntry {
    let date:Date,configuration:CalendarWidgetIntent,row:SnapshotRow?,payload:SharedCalendar?
    func text(_ cn:String)->String {
        let all:[String:[String:String]]=[
            "zh-TW":["言道日历":"言道日曆","打开日历刷新":"開啟日曆重新整理","四柱快照":"四柱快照","有一项安排":"有一項安排","暂无安排":"暫無安排"],
            "ja":["言道日历":"言道カレンダー","打开日历刷新":"アプリで暦を更新","四柱快照":"四柱の記録","有一项安排":"予定があります","暂无安排":"予定はありません"],
            "en":["言道日历":"Yandao calendar","打开日历刷新":"Open calendar to refresh","四柱快照":"Pillars snapshot","有一项安排":"You have an event","暂无安排":"No upcoming events"]]
        return all[payload?.locale ?? "zh-CN"]?[cn] ?? cn
    }
}
struct CalendarProvider:AppIntentTimelineProvider {
    func placeholder(in context:Context)->CalendarEntry {CalendarEntry(date:.now,configuration:CalendarWidgetIntent(),row:nil,payload:nil)}
    func read()->SharedCalendar? {
        guard let root=FileManager.default.containerURL(forSecurityApplicationGroupIdentifier:"group.com.yandaoguoxue.calendar"),let bytes=try? Data(contentsOf:root.appendingPathComponent("calendar-v1.json")),let data=try? JSONDecoder().decode(SharedCalendar.self,from:bytes),data.snapshot.schemaVersion==1 else{return nil}
        return data
    }
    func snapshot(for configuration:CalendarWidgetIntent,in context:Context) async->CalendarEntry {
        let data=read(),now=Date().timeIntervalSince1970*1000
        let row=data?.snapshot.entries.first{$0.from<=now&&$0.until>now}
        return CalendarEntry(date:.now,configuration:configuration,row:row,payload:data)
    }
    func timeline(for configuration:CalendarWidgetIntent,in context:Context) async->Timeline<CalendarEntry> {
        let data=read(),now=Date().timeIntervalSince1970*1000
        var entries:[CalendarEntry]=[]
        if let data=data,data.snapshot.expiresAt>now {
            var moments=Set(data.snapshot.entries.filter{$0.until>now}.map{max($0.from,now)})
            for event in data.agenda ?? [] {if event.at>now&&event.at<data.snapshot.expiresAt{moments.insert(event.at)}}
            entries=moments.sorted().map{time in CalendarEntry(date:Date(timeIntervalSince1970:time/1000),configuration:configuration,row:data.snapshot.entries.first{$0.from<=time&&$0.until>time},payload:data)}
            entries.append(CalendarEntry(date:Date(timeIntervalSince1970:data.snapshot.expiresAt/1000),configuration:configuration,row:nil,payload:data))
        }
        if entries.isEmpty{entries=[CalendarEntry(date:.now,configuration:configuration,row:nil,payload:data)]}
        return Timeline(entries:entries,policy:.after(Date(timeIntervalSince1970:max((data?.snapshot.expiresAt ?? now)/1000,Date().timeIntervalSince1970+86400))))
    }
}
struct CalendarWidgetView:View {
    let entry:CalendarEntry,mode:String
    @Environment(\.widgetFamily) var family
    var compact:Bool {family == .accessoryInline || family == .accessoryCircular || family == .accessoryRectangular}
    var body:some View {
        Group {
            if let row=entry.row {
                if compact {
                    VStack(alignment:.leading,spacing:2){Text(row.lunar+" "+row.jieqi).font(.caption);if mode == "pillars" {Text(row.pillars).font(.caption2).minimumScaleFactor(0.7)}else if mode == "agenda"{Text(entry.text(nextAgenda == nil ? "暂无安排":"有一项安排")).font(.caption)}}
                }else{
                    VStack(alignment:.leading,spacing:entry.configuration.largeText ? 8:5){
                        Text(entry.text("言道日历")).font(.caption).opacity(0.7)
                        if mode != "agenda"{
                            // A native dynamic timer renders local HH:mm:ss without
                            // minute-by-minute wakeups. Shared timeline offsets reset
                            // the base at midnight and DST transitions.
                            let start=Date(timeIntervalSince1970:row.from/1000-Double(row.secondsOfDay))
                            Text(timerInterval:start...start.addingTimeInterval(86400),countsDown:false,showsHours:true).monospacedDigit().font(.system(size:entry.configuration.largeText ? 37:31,weight:.light)).minimumScaleFactor(0.6)
                        }
                        Text(row.solar).font(.caption)
                        Text(row.lunar+" "+row.jieqi).font(entry.configuration.largeText ? .headline:.subheadline)
                        if mode == "pillars"{Text(row.pillars).font(entry.configuration.largeText ? .body:.caption).minimumScaleFactor(0.65);Text(entry.text("四柱快照")+" · "+row.clock).font(.caption2).opacity(0.7)}
                        if mode == "agenda"{Text(entry.text(nextAgenda == nil ? "暂无安排":"有一项安排")).font(.headline).privacySensitive();if let next=nextAgenda{Text(Date(timeIntervalSince1970:next.at/1000),style:.time).font(.title2).privacySensitive()}}
                        Text(entry.payload?.snapshot.timeZone ?? "").font(.caption2).opacity(0.65)
                    }.frame(maxWidth:.infinity,maxHeight:.infinity,alignment:.leading).foregroundStyle(entry.configuration.theme.foreground)
                }
            }else{Text(entry.text("打开日历刷新")).font(.caption)}
        }.widgetURL(URL(string:"yandaoguoxue://calendar"))
         .containerBackground(entry.configuration.theme.background,for:.widget)
    }
    var nextAgenda:AgendaData? {entry.payload?.agenda?.first{$0.at>entry.date.timeIntervalSince1970*1000}}
}
struct CalendarClockWidget:Widget {
    let kind="YandaoCalendarClock"
    var body:some WidgetConfiguration {AppIntentConfiguration(kind:kind,intent:CalendarWidgetIntent.self,provider:CalendarProvider()){entry in CalendarWidgetView(entry:entry,mode:"clock")}.configurationDisplayName("Calendar clock").description("System time, lunar date and solar term").supportedFamilies([.systemSmall,.systemMedium,.accessoryInline,.accessoryRectangular])}
}
struct CalendarPillarsWidget:Widget {
    let kind="YandaoCalendarPillars"
    var body:some WidgetConfiguration {AppIntentConfiguration(kind:kind,intent:CalendarWidgetIntent.self,provider:CalendarProvider()){entry in CalendarWidgetView(entry:entry,mode:"pillars")}.configurationDisplayName("Four pillars calendar").description("Shared calendar snapshot, not a birth chart").supportedFamilies([.systemMedium,.systemLarge,.accessoryRectangular])}
}
struct CalendarAgendaWidget:Widget {
    let kind="YandaoCalendarAgenda"
    var body:some WidgetConfiguration {AppIntentConfiguration(kind:kind,intent:CalendarWidgetIntent.self,provider:CalendarProvider()){entry in CalendarWidgetView(entry:entry,mode:"agenda")}.configurationDisplayName("Private agenda").description("Only a private summary, never names or birthdays").supportedFamilies([.systemSmall,.systemMedium,.accessoryRectangular])}
}
@main struct YandaoCalendarWidgets:WidgetBundle {var body:some Widget {CalendarClockWidget();CalendarPillarsWidget();CalendarAgendaWidget()}}
