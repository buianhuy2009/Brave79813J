import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  FileText, 
  Download, 
  ExternalLink, 
  Search, 
  Award, 
  ShieldAlert, 
  Layers, 
  Bot, 
  Zap, 
  CheckCircle2, 
  Info, 
  Clock, 
  Sparkles,
  Users,
  ChevronRight
} from 'lucide-react';
import { GAME_INFO } from '../constants/rules';
import { translations } from '../constants/translations';

export default function GameManual({ lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const isVi = lang === 'vi';

  // View mode: 'summary' or 'pdf'
  const [viewMode, setViewMode] = useState('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const pdfUrl = '/assets/LevelUp-2.1.pdf';

  // Rule Sections Data
  const rulesData = useMemo(() => [
    {
      id: 'scoring',
      category: 'scoring',
      tag: '<SC1> - <SC5>',
      titleEn: 'Scoring Matrix & Criteria',
      titleVi: 'Hệ thống tính điểm & Điều kiện công nhận',
      icon: Award,
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      itemsEn: [
        {
          heading: 'Level 4 Goal (16 PTS / Bag)',
          highlight: 'YELLOW BAGS ONLY',
          detail: 'Bean Bags must be Yellow and fully resting on the L4 Goal or another scored L4 Bean Bag without touching any Robot. Red or Blue bags on L4 score 0 points. Maximum 6 Yellow bags on field (up to 96 pts).'
        },
        {
          heading: 'Level 3 Goal (12 PTS / Bag)',
          highlight: 'Red, Blue, or Yellow',
          detail: 'Bean Bags must match the color of the Pyramid Goal, or be Yellow. Resting on L3 Goal or supported by other scored bags.'
        },
        {
          heading: 'Level 2 Goal (6 PTS / Bag)',
          highlight: 'Red, Blue, or Yellow',
          detail: 'Bean Bags must match Pyramid color or be Yellow, resting on Level 2 structure.'
        },
        {
          heading: 'Level 1 Goal (3 PTS / Bag)',
          highlight: 'Red, Blue, or Yellow',
          detail: 'Bean Bags resting on the lowest elevated pyramid level.'
        },
        {
          heading: 'Floor Goal (1 PT / Bag)',
          highlight: 'In Color Boundary',
          detail: 'Bean Bags must be fully inside the Floor Goal tape perimeter (<SC3b>) and match the floor zone color, or be Yellow.'
        },
        {
          heading: 'Evaluation Timing (<SC1>, <SC2>)',
          highlight: 'After Match Ends',
          detail: 'All scoring statuses are evaluated visually by the Head Referee only after all robots and scoring objects come to a complete rest. No photo/video review allowed (<T3>).'
        }
      ],
      itemsVi: [
        {
          heading: 'Mục tiêu Tầng 4 - L4 (16 ĐIỂM / Túi)',
          highlight: 'CHỈ TÚI VÀNG',
          detail: 'Túi hạt phải là màu VÀNG và đặt hoàn toàn trên đỉnh L4 Goal hoặc chồng lên túi hạt L4 hợp lệ khác, không chạm robot. Túi đỏ/xanh đặt lên L4 tính 0 điểm. Tối đa 6 túi vàng trên toàn sân (tối đa 96 điểm).'
        },
        {
          heading: 'Mục tiêu Tầng 3 - L3 (12 ĐIỂM / Túi)',
          highlight: 'Đỏ, Xanh hoặc Vàng',
          detail: 'Túi hạt phải trùng màu với Kim tự tháp (Red/Blue) hoặc là túi Vàng. Nằm trên tầng 3 hoặc được nâng đỡ bởi các túi hợp lệ.'
        },
        {
          heading: 'Mục tiêu Tầng 2 - L2 (6 ĐIỂM / Túi)',
          highlight: 'Đỏ, Xanh hoặc Vàng',
          detail: 'Túi hạt trùng màu kim tự tháp hoặc màu vàng, nằm trên kết cấu tầng 2.'
        },
        {
          heading: 'Mục tiêu Tầng 1 - L1 (3 ĐIỂM / Túi)',
          highlight: 'Đỏ, Xanh hoặc Vàng',
          detail: 'Túi hạt nằm trên tầng nâng thấp nhất của kim tự tháp.'
        },
        {
          heading: 'Mục tiêu Sàn - Floor Goal (1 ĐIỂM / Túi)',
          highlight: 'Trong đường biên sàn',
          detail: 'Túi hạt phải nằm trọn vẹn bên trong ranh giới băng dán mục tiêu sàn (<SC3b>) và trùng màu khu vực sàn hoặc là túi Vàng.'
        },
        {
          heading: 'Thời điểm chấm điểm (<SC1>, <SC2>)',
          highlight: 'Sau khi trận kết thúc',
          detail: 'Tất cả điểm số chỉ được Trọng tài chính quan sát và xác nhận bằng mắt sau khi mọi vật thể và robot ngừng chuyển động hoàn toàn. Không xem lại video/ảnh chụp (<T3>).'
        }
      ]
    },
    {
      id: 'robot',
      category: 'robot',
      tag: '<SG1>, <SG2>, <SG3>, Section 4',
      titleEn: 'Robot Size & Expansion Limits',
      titleVi: 'Kích thước & Giới hạn mở rộng Robot',
      icon: Bot,
      badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      itemsEn: [
        {
          heading: 'Starting Dimensions (<SG1>, <R3>)',
          highlight: '11" x 20" x 15" Max',
          detail: 'Before the match starts, robot must fit within an 11" wide x 20" long x 15" high (279 x 508 x 381 mm) volume. Must start completely stationary within designated starting position.'
        },
        {
          heading: 'Horizontal Expansion Limit (<SG2>)',
          highlight: 'Max 11" x 24" at ALL times',
          detail: 'Once the match begins, horizontal expansion is strictly restricted to an 11" x 24" rectangular footprint. Teams must ensure mechanisms arcing upwards do not exceed 24" length.'
        },
        {
          heading: 'Vertical Expansion (<SG3>)',
          highlight: 'UNLIMITED during match',
          detail: 'Once the match starts, robots may expand vertically beyond the 15" starting limit with NO restrictions to reach higher goals.'
        },
        {
          heading: 'Legal Components (<R12>)',
          highlight: 'Official VEX IQ only',
          detail: 'Robots must be built exclusively from official VEX IQ components. No 3D-printed structural parts, metal screws, or adhesives allowed.'
        }
      ],
      itemsVi: [
        {
          heading: 'Kích thước xuất phát (<SG1>, <R3>)',
          highlight: 'Tối đa 11" x 20" x 15"',
          detail: 'Trước khi bắt đầu trận, robot phải nằm gọn trong kích thước 11" rộng x 20" dài x 15" cao (279 x 508 x 381 mm). Đứng yên hoàn toàn tại vị trí xuất phát quy định.'
        },
        {
          heading: 'Giới hạn mở rộng chiều ngang (<SG2>)',
          highlight: 'Tối đa 11" x 24" mọi lúc',
          detail: 'Trong suốt trận đấu, robot chỉ được phép mở rộng chiều ngang tối đa trong hình chữ nhật 11" x 24". Cơ cấu vươn/tay quay không được vượt quá 24" tại bất kỳ thời điểm nào.'
        },
        {
          heading: 'Mở rộng chiều cao (<SG3>)',
          highlight: 'KHÔNG GIỚI HẠN trong trận',
          detail: 'Khi trận đấu bắt đầu, robot được phép mở rộng chiều cao không giới hạn để tiếp cận các tầng cao L3, L4.'
        },
        {
          heading: 'Linh kiện hợp lệ (<R12>)',
          highlight: 'Chỉ dùng linh kiện VEX IQ chính hãng',
          detail: 'Robot phải được lắp ráp hoàn toàn từ linh kiện VEX IQ chính hãng. Cấm in 3D kết cấu cơ khí, ốc kim loại không thuộc hệ hoặc keo dán.'
        }
      ]
    },
    {
      id: 'gameplay',
      category: 'match',
      tag: '<SG4> - <SG7>',
      titleEn: 'Gameplay, Possession & Loading',
      titleVi: 'Kiểm soát túi hạt & Nạp vật thể thi đấu',
      icon: Zap,
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      itemsEn: [
        {
          heading: 'Possession & Plowing Limit (<SG6>)',
          highlight: 'STRICT 1 BAG LIMIT',
          detail: 'A robot may NOT possess or plow more than ONE (1) Bean Bag at any given time. Plowing or controlling 2 or more bags simultaneously is an illegal violation!'
        },
        {
          heading: 'Preloads (<SG5>)',
          highlight: '1 Yellow Bag per Robot',
          detail: 'Each robot is given one (1) Yellow Bean Bag as a Preload before match start, placed in contact with the robot in its starting position.'
        },
        {
          heading: 'Load Zone & Loaders (<SG7>)',
          highlight: 'Loader Role',
          detail: 'Up to three students form the Drive Team (Driver 1, Driver 2, Loader). The Loader introduces bags into the Field through designated Load Zones only.'
        },
        {
          heading: 'Objects Leaving the Field (<SG4>)',
          highlight: 'Dead Bags',
          detail: 'Any Bean Bag that leaves the field perimeter during a match will not be returned to the field and cannot be reloaded.'
        }
      ],
      itemsVi: [
        {
          heading: 'Giới hạn kiểm soát / ủi hạt (<SG6>)',
          highlight: 'NGHIÊM NGẶT 1 TÚI DUY NHẤT',
          detail: 'Robot TUYỆT ĐỐI KHÔNG được giữ (possession) hoặc ủi (plow) nhiều hơn MỘT (1) túi hạt tại một thời điểm. Kiểm soát từ 2 túi hạt trở lên cùng lúc là phạm quy nghiêm trọng!'
        },
        {
          heading: 'Túi hạt nạp sẵn - Preload (<SG5>)',
          highlight: '1 Túi Vàng mỗi Robot',
          detail: 'Mỗi robot được nhận 1 túi hạt VÀNG làm Preload trước khi trận đấu bắt đầu, tiếp xúc trực tiếp với robot trong ô xuất phát.'
        },
        {
          heading: 'Vùng nạp & Người nạp hạt (<SG7>)',
          highlight: 'Vai trò Loader',
          detail: 'Đội điều khiển tối đa 3 học sinh (Lái 1, Lái 2, Người nạp Loader). Loader đưa túi hạt vào sân qua các Vùng Nạp (Load Zones) được quy định.'
        },
        {
          heading: 'Túi hạt rơi ra ngoài sân (<SG4>)',
          highlight: 'Không hoàn lại',
          detail: 'Bất kỳ túi hạt nào rơi ra khỏi thành sân trong khi thi đấu sẽ bị loại bỏ khỏi trận và không được nạp lại.'
        }
      ]
    },
    {
      id: 'rules_general',
      category: 'match',
      tag: '<G1>, <G2>, <GG11>, <GG12>',
      titleEn: 'Match Operations & Student Centered',
      titleVi: 'Vận hành trận đấu & Chính sách Học sinh làm chủ',
      icon: Users,
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      itemsEn: [
        {
          heading: 'Student-Centered Policy (<G2>)',
          highlight: 'Students Design, Build & Drive',
          detail: 'VIQRC is 100% student-centered. Students design, build, code, and drive the robot. Adults may mentor and teach concepts, but NEVER work on the robot, code, or notebook.'
        },
        {
          heading: 'Driver Switch Window (<GG11>)',
          highlight: '35s - 25s Remaining',
          detail: 'In Teamwork and Driver Skills matches, Driver 1 operates for the first 30 seconds. Handover of the controller to Driver 2 must occur between 35 and 25 seconds remaining.'
        },
        {
          heading: 'Handling Robot Mid-Match (<GG10>)',
          highlight: 'Referee Permission Only',
          detail: 'Drivers may only touch/handle their robot during a match to reset or retrieve it after requesting permission from the Head Referee, placing it back in legal starting tile.'
        },
        {
          heading: 'Match Buzzer & Early End (<GG12>, <GG13>)',
          highlight: 'Stop All Movement',
          detail: 'Robots must immediately cease all movement when the timer hits 0. Teams may also declare an early stop to the referee.'
        }
      ],
      itemsVi: [
        {
          heading: 'Chính sách Học sinh làm chủ (<G2>)',
          highlight: 'Học sinh Thiết kế, Lắp ráp & Lập trình',
          detail: 'VEX IQ là chương trình hoàn toàn do học sinh làm chủ. Học sinh tự thiết kế, lắp ráp, viết code và thi đấu. Người lớn chỉ đóng vai trò hướng dẫn nguyên lý, tuyệt đối không làm thay.'
        },
        {
          heading: 'Khung giờ đổi tay lái (<GG11>)',
          highlight: 'Còn lại từ 35s đến 25s',
          detail: 'Trong các trận Teamwork và Driver Skills, Tay lái 1 điều khiển 30s đầu. Việc chuyển giao tay cầm sang Tay lái 2 phải diễn ra trong khoảng thời gian còn 35s - 25s.'
        },
        {
          heading: 'Chạm vào Robot giữa trận (<GG10>)',
          highlight: 'Phải xin phép Trọng tài',
          detail: 'Thí sinh chỉ được can thiệp vào robot khi robot bị kẹt hoặc lật sau khi đã xin phép Trọng tài chính và đặt lại về ô xuất phát ban đầu.'
        },
        {
          heading: 'Kết thúc trận đấu (<GG12>, <GG13>)',
          highlight: 'Ngừng mọi chuyển động',
          detail: 'Robot phải dừng mọi động cơ ngay khi còi báo hết giờ kêu. Đội thi cũng có thể xin dừng trận sớm.'
        }
      ]
    },
    {
      id: 'skills',
      category: 'skills',
      tag: '<RSC1> - <RSC8>',
      titleEn: 'Robot Skills Challenge Rules',
      titleVi: 'Luật thi đấu Phần thi Kỹ năng (Robot Skills)',
      icon: Clock,
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      itemsEn: [
        {
          heading: 'Driving Skills Match',
          highlight: '60s Driver Controlled',
          detail: 'One robot operated by student drivers on the field attempting to maximize score within 60 seconds. Controller switch rules apply.'
        },
        {
          heading: 'Autonomous Coding Skills Match',
          highlight: '60s Code Only (No Human)',
          detail: 'One robot operating entirely autonomously through student-written code. Students may not touch the controller once started (<RSC7>).'
        },
        {
          heading: 'Skills Stop Time (<RSC8>)',
          highlight: 'Global Tiebreaker',
          detail: 'If a team clears all points or finishes early, they can call Skills Stop Time. Remaining seconds serve as the official tiebreaker on World and National Skills Rankings!'
        }
      ],
      itemsVi: [
        {
          heading: 'Trận Kỹ năng Lái (Driving Skills)',
          highlight: '60 giây điều khiển bằng tay',
          detail: 'Một robot duy nhất trên sân do 2 tay lái học sinh điều khiển cố gắng đạt điểm tối đa trong 60 giây. Áp dụng quy tắc đổi tay lái.'
        },
        {
          heading: 'Trận Kỹ năng Lập trình (Autonomous Coding Skills)',
          highlight: '60 giây tự hành hoàn toàn',
          detail: 'Robot vận hành hoàn toàn bằng code do học sinh tự lập trình. Không ai được chạm vào tay cầm sau khi khởi động chương trình (<RSC7>).'
        },
        {
          heading: 'Thời gian dừng Skills (<RSC8>)',
          highlight: 'Chỉ số phân hạng Tiebreaker',
          detail: 'Nếu robot hoàn thành sớm, đội có thể bấm dừng trận để ghi nhận Skills Stop Time. Số giây còn lại là tiêu chí xếp hạng phụ chính thức trên Bảng xếp hạng Thế giới & Quốc gia!'
        }
      ]
    },
    {
      id: 'changelog',
      category: 'changelog',
      tag: 'Manual v2.1 (Oct 8, 2026)',
      titleEn: 'Official Version 2.1 Changelog',
      titleVi: 'Điểm mới trong Sổ tay Luật Bản 2.1',
      icon: Sparkles,
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      itemsEn: [
        {
          heading: 'Appendix E Clarity',
          highlight: 'Updated in v2.1',
          detail: 'Provided explicit definitions and clarification regarding Team Classifications and Student Roles across Elementary and Middle School divisions.'
        },
        {
          heading: 'Floor Goal Boundaries (<SC3b>)',
          highlight: 'Updated in v2.0/v2.1',
          detail: 'Revised floor goal perimeter tape line interpretations and criteria for fully scored bean bags.'
        },
        {
          heading: 'Load Zone Boundaries (<SG7>)',
          highlight: 'Boundary Refinement',
          detail: 'Updated field figures and regulations defining legal loader hand positions and placement zones.'
        },
        {
          heading: 'Power Button Accessibility (<R7>)',
          highlight: 'Recommendation',
          detail: 'Revised rule <R7> to strongly recommend (rather than strictly require) direct exterior access to the Robot Brain power button.'
        },
        {
          heading: 'Plowing vs Possession Definitions',
          highlight: 'Refined Intent',
          detail: 'Clarified the distinction between momentary incidental plowing versus intentional possession under rule <SG6>.'
        }
      ],
      itemsVi: [
        {
          heading: 'Làm rõ Phụ lục E (Appendix E)',
          highlight: 'Cập nhật bản v2.1',
          detail: 'Quy định chi tiết và rõ ràng hơn về Phân loại Đội thi và Vai trò Học sinh giữa bảng Tiểu học và THCS.'
        },
        {
          heading: 'Ranh giới Mục tiêu Sàn (<SC3b>)',
          highlight: 'Cập nhật từ v2.0 / v2.1',
          detail: 'Chuẩn hóa định nghĩa đường biên băng dính mục tiêu sàn và điều kiện túi hạt được tính là hoàn toàn bên trong.'
        },
        {
          heading: 'Ranh giới Vùng nạp hạt (<SG7>)',
          highlight: 'Điều chỉnh ranh giới',
          detail: 'Cập nhật hình ảnh sân và vùng nạp hợp lệ để hỗ trợ người nạp túi hạt (Loader) thao tác chính xác.'
        },
        {
          heading: 'Vị trí nút nguồn Brain (<R7>)',
          highlight: 'Khuyến nghị',
          detail: 'Chuyển quy định vị trí nút nguồn trên não robot từ bắt buộc sang khuyến nghị nên dễ tiếp cận từ bên ngoài.'
        },
        {
          heading: 'Định nghĩa Giữ (Possession) vs Ủi (Plowing)',
          highlight: 'Làm rõ bản chất',
          detail: 'Phân định rõ ràng giữa hành vi vô tình va chạm túi hạt với hành vi cố ý giữ/ủi nhiều hơn 1 túi hạt theo điều <SG6>.'
        }
      ]
    }
  ], []);

  // Filter and search logic
  const filteredSections = useMemo(() => {
    return rulesData.filter(section => {
      // Category filter
      if (selectedFilter !== 'all' && section.category !== selectedFilter) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = (isVi ? section.titleVi : section.titleEn).toLowerCase();
      const tag = section.tag.toLowerCase();
      const items = isVi ? section.itemsVi : section.itemsEn;
      const itemMatch = items.some(it => 
        it.heading.toLowerCase().includes(q) || 
        it.highlight.toLowerCase().includes(q) || 
        it.detail.toLowerCase().includes(q)
      );
      return title.includes(q) || tag.includes(q) || itemMatch;
    });
  }, [rulesData, selectedFilter, searchQuery, isVi]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* Top Banner / Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Season Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                Official Manual {GAME_INFO.manualVersion}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Released Oct 8, 2026
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.gameManual} — {GAME_INFO.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isVi 
                ? 'Xem toàn bộ tài liệu PDF gốc hoặc tra cứu bản tóm tắt luật nhanh tương tác.'
                : 'Browse the official full tournament manual PDF or inspect the interactive summarized rules guide.'}
            </p>
          </div>

          {/* Quick PDF Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={pdfUrl}
              download="VEX_IQ_Level_Up_Game_Manual_v2.1.pdf"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{t.downloadPdf}</span>
            </a>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all shadow-sm shadow-cyan-500/20"
              title="Open PDF in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t.openNewTab}</span>
            </a>
          </div>
        </div>

        {/* View Mode Segmented Switcher */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'summary'
                  ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-950" />
              <span>{t.summarizedVersion}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('pdf')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'pdf'
                  ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-950" />
              <span>{t.fullPdfVersion}</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            82 {isVi ? 'trang chính thức' : 'official pages'} • 6.8 MB
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SUMMARIZED VERSION */}
      {viewMode === 'summary' && (
        <div className="space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isVi ? 'Thời gian trận' : 'Match Duration'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                60s
              </span>
              <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                {isVi ? 'Đổi tay lái: 35s-25s' : 'Switch at 35s-25s'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isVi ? 'Tổng túi hạt' : 'Total Bean Bags'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                38
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                16 {isVi ? 'Đỏ' : 'Red'} • 16 {isVi ? 'Xanh' : 'Blue'} • 6 {isVi ? 'Vàng' : 'Yellow'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isVi ? 'Điểm tối đa' : 'Theoretical Max'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-500 dark:text-yellow-400 mt-1 block">
                480 pts
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {isVi ? 'Tất cả lên L3 & L4' : 'All cleared to L3 & L4'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isVi ? 'Kích thước Robot' : 'Max Start Size'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                11"×20"
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {isVi ? 'Cao ≤ 15" ban đầu' : 'Height ≤ 15" start'}
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchRulesPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
              {[
                { id: 'all', label: t.filterAll },
                { id: 'scoring', label: t.filterScoring },
                { id: 'robot', label: t.filterRobot },
                { id: 'match', label: t.filterMatch },
                { id: 'skills', label: t.filterSkills },
                { id: 'changelog', label: t.filterChangelog },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFilter(f.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition-all border ${
                    selectedFilter === f.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rule Cards List */}
          <div className="space-y-4">
            {filteredSections.map(section => {
              const IconComp = section.icon;
              const items = isVi ? section.itemsVi : section.itemsEn;
              const title = isVi ? section.titleVi : section.titleEn;

              return (
                <div 
                  key={section.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  {/* Section Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                          {title}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {section.tag}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${section.badgeColor}`}>
                      {section.category.toUpperCase()}
                    </span>
                  </div>

                  {/* Section Content Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {items.map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                              {item.heading}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 shrink-0">
                              {item.highlight}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredSections.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Search className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isVi ? 'Không tìm thấy luật phù hợp' : 'No matching rules found'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isVi ? 'Hãy thử tìm từ khóa khác hoặc xóa bộ lọc tìm kiếm.' : 'Try a different keyword or reset filters.'}
                </p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedFilter('all'); }}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {isVi ? 'Đặt lại bộ lọc' : 'Reset Filters'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FULL PDF VIEWER */}
      {viewMode === 'pdf' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-5 shadow-sm space-y-4">
          
          {/* Top Bar for PDF */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-500" />
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                VEX IQ Level Up Game Manual Version 2.1 (PDF)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={pdfUrl}
                download="VEX_IQ_Level_Up_Game_Manual_v2.1.pdf"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>

              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </a>
            </div>
          </div>

          {/* Embedded PDF iframe */}
          <div className="w-full h-[78vh] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 relative">
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1`}
              title="VEX IQ Level Up Game Manual v2.1"
              className="w-full h-full border-0"
            />
          </div>

          {/* Footnote if mobile browser doesn't render iframe PDF */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
            <span>
              {isVi 
                ? 'Nếu trình duyệt không hiển thị tài liệu PDF trực tiếp, vui lòng bấm nút Mở toàn màn hình hoặc Tải PDF.' 
                : 'If your browser does not support inline PDF viewing, please click Fullscreen or Download PDF.'}
            </span>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
            >
              {isVi ? 'Mở trực tiếp tài liệu PDF →' : 'Open PDF directly →'}
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
